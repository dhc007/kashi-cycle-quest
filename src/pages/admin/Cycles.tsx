import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/FileUpload";
import { Bike, Plus, Pencil, Trash2, MoreVertical, Copy, Search, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Accessory {
  id: string;
  name: string;
}

interface Cycle {
  id: string;
  name: string;
  model: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  media_urls: string[] | null;
  price_per_day: number;
  price_per_week: number;
  price_per_month: number | null;
  security_deposit_day: number;
  security_deposit_week: number;
  security_deposit_month: number;
  is_active: boolean;
  free_accessories: string[] | null;
  specifications: string | null;
  internal_details: any;
  serial_number?: string | null;
  model_number?: string | null;
  internal_tracking_id?: string | null;
  user_manual_url?: string | null;
  display_serial?: string | null;
}

const Cycles = () => {
  const { toast } = useToast();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [warrantyFile, setWarrantyFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [userManualFile, setUserManualFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [accessorySearch, setAccessorySearch] = useState("");
  const [accessoryPopoverOpen, setAccessoryPopoverOpen] = useState(false);
  const [specInput, setSpecInput] = useState("");
  const [showSpecSuggestions, setShowSpecSuggestions] = useState(false);
  const [allSpecifications] = useState([
    "36v 250 watt ultra standard kit",
    "10.4 ah hard pack Lithium ion Detachable battery",
    "Plastic mudgaurds",
    "36v 2amp autocutoff charger",
    "85% fitted bicycle skd condition",
  ]);
  const [formData, setFormData] = useState<Partial<Cycle>>({
    name: "",
    model: "",
    description: "",
    image_url: "",
    video_url: "",
    media_urls: [],
    price_per_day: 0,
    price_per_week: 0,
    price_per_month: 0,
    security_deposit_day: 2000,
    security_deposit_week: 3000,
    security_deposit_month: 5000,
    is_active: true,
    free_accessories: [],
    specifications: "",
    serial_number: "",
    model_number: "",
    user_manual_url: "",
    internal_details: {
      vendor: "",
      warranty: "",
      invoice: "",
      warranty_file_url: "",
      invoice_file_url: "",
      date_received: "",
      purchase_amount: 0,
    },
  });

  useEffect(() => {
    Promise.all([loadCycles(), loadAccessories()]);
  }, []);

  const loadCycles = async () => {
    try {
      const { data, error } = await supabase.from("cycles").select("*").order("created_at", { ascending: false });

      if (error) throw error;

      // Convert specifications from Json to string if needed
      const processedData = (data || []).map((cycle) => ({
        ...cycle,
        specifications:
          typeof cycle.specifications === "string"
            ? cycle.specifications
            : cycle.specifications
              ? JSON.stringify(cycle.specifications)
              : "",
      }));

      setCycles(processedData as Cycle[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAccessories = async () => {
    try {
      const { data, error } = await supabase.from("accessories").select("id, name").eq("is_active", true);

      if (error) throw error;
      setAccessories(data || []);
    } catch (error: any) {
      console.error("Error loading accessories:", error);
    }
  };

  const uploadFile = async (file: File, bucket: string = "cycles"): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingImage(true);

    try {
      let imageUrl = formData.image_url;
      let mediaUrls = formData.media_urls || [];
      let warrantyFileUrl = formData.internal_details?.warranty_file_url || "";
      let invoiceFileUrl = formData.internal_details?.invoice_file_url || "";

      if (imageFile) {
        imageUrl = await uploadFile(imageFile);
      }

      // Upload media files
      if (mediaFiles.length > 0) {
        const uploadedMediaUrls = await Promise.all(mediaFiles.map((file) => uploadFile(file)));
        mediaUrls = uploadedMediaUrls;
      }

      // Upload warranty file
      if (warrantyFile) {
        warrantyFileUrl = await uploadFile(warrantyFile, "documents");
      }

      // Upload invoice file
      if (invoiceFile) {
        invoiceFileUrl = await uploadFile(invoiceFile, "documents");
      }

      if (editingCycle) {
        const { error } = await supabase
          .from("cycles")
          .update({
            ...formData,
            image_url: imageUrl,
            media_urls: mediaUrls,
            free_accessories: formData.free_accessories || [],
            specifications: formData.specifications || "",
            internal_details: {
              ...(formData.internal_details || {}),
              warranty_file_url: warrantyFileUrl,
              invoice_file_url: invoiceFileUrl,
            },
          })
          .eq("id", editingCycle.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Cycle updated successfully",
        });
      } else {
        const { error } = await supabase.from("cycles").insert([
          {
            name: formData.name!,
            model: formData.model!,
            description: formData.description || null,
            image_url: imageUrl || null,
            video_url: formData.video_url || null,
            media_urls: mediaUrls,
            price_per_hour: 0,
            price_per_day: formData.price_per_day!,
            price_per_week: formData.price_per_week!,
            price_per_month: formData.price_per_month || null,
            security_deposit_day: formData.security_deposit_day!,
            security_deposit_week: formData.security_deposit_week!,
            security_deposit_month: formData.security_deposit_month!,
            total_quantity: 1,
            available_quantity: 1,
            is_active: formData.is_active!,
            free_accessories: formData.free_accessories || [],
            specifications: formData.specifications || "",
            internal_details: formData.internal_details || { vendor: "", warranty: "", invoice: "" },
          },
        ]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Cycle created successfully",
        });
      }

      setDialogOpen(false);
      setEditingCycle(null);
      setImageFile(null);
      setUserManualFile(null);
      resetForm();
      loadCycles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      model: "",
      description: "",
      image_url: "",
      video_url: "",
      media_urls: [],
      price_per_day: 0,
      price_per_week: 0,
      price_per_month: 0,
      security_deposit_day: 2000,
      security_deposit_week: 3000,
      security_deposit_month: 5000,
      is_active: true,
      free_accessories: [],
      specifications: "",
      serial_number: "",
      model_number: "",
      user_manual_url: "",
      internal_details: {
        vendor: "",
        warranty: "",
        invoice: "",
        warranty_file_url: "",
        invoice_file_url: "",
        date_received: "",
        purchase_amount: 0,
      },
    });
    setImageFile(null);
    setMediaFiles([]);
    setWarrantyFile(null);
    setInvoiceFile(null);
    setUserManualFile(null);
  };

  const handleEdit = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setFormData(cycle);
    setDialogOpen(true);
  };

  const handleDuplicate = (cycle: Cycle) => {
    setEditingCycle(null);
    setFormData({
      ...cycle,
      id: undefined,
      name: `${cycle.name} (Copy)`,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cycle?")) return;

    try {
      const { error } = await supabase.from("cycles").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Cycle deleted successfully",
      });
      loadCycles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (cycle: Cycle) => {
    try {
      const { error } = await supabase.from("cycles").update({ is_active: !cycle.is_active }).eq("id", cycle.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Cycle ${!cycle.is_active ? "activated" : "deactivated"}`,
      });
      loadCycles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addAccessory = (accessoryId: string) => {
    const current = formData.free_accessories || [];
    if (!current.includes(accessoryId)) {
      setFormData({
        ...formData,
        free_accessories: [...current, accessoryId],
      });
    }
    setAccessoryPopoverOpen(false);
    setAccessorySearch("");
  };

  const removeAccessory = (accessoryId: string) => {
    const current = formData.free_accessories || [];
    setFormData({
      ...formData,
      free_accessories: current.filter((id) => id !== accessoryId),
    });
  };

  const addSpecification = (spec: string) => {
    const current = formData.specifications || "";
    const specs = current.split("\n").filter((s) => s.trim());
    if (!specs.includes(spec.trim())) {
      specs.push(spec.trim());
      setFormData({
        ...formData,
        specifications: specs.join("\n"),
      });
    }
    setSpecInput("");
    setShowSpecSuggestions(false);
  };

  const removeSpecification = (spec: string) => {
    const current = formData.specifications || "";
    const specs = current.split("\n").filter((s) => s.trim() && s.trim() !== spec.trim());
    setFormData({
      ...formData,
      specifications: specs.join("\n"),
    });
  };

  const filteredSpecs = allSpecifications.filter(
    (spec) =>
      spec.toLowerCase().includes(specInput.toLowerCase()) &&
      !(formData.specifications || "").split("\n").includes(spec),
  );

  const filteredCycles = cycles.filter(
    (cycle) =>
      cycle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cycle.model.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredAccessories = accessories.filter((acc) =>
    acc.name.toLowerCase().includes(accessorySearch.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bike className="w-8 h-8" />
            Cycles Inventory
          </h1>
          <p className="text-muted-foreground">Manage your electric bicycle fleet</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90" onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Cycle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCycle ? "Edit Cycle" : "Add New Cycle"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url || ""}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_url">Video URL</Label>
                <Input
                  id="video_url"
                  value={formData.video_url || ""}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://... (optional video URL)"
                />
              </div>

              <FileUpload
                label="Upload Cycle Image"
                accept="image/*"
                onFileSelect={(file) => setImageFile(file)}
                maxSize={5}
                description="Upload a cycle image (max 5MB)"
              />

              <div className="space-y-2">
                <Label>Media Gallery (Images & Videos - Max 6 files)</Label>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-muted">
                  {mediaFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative flex-shrink-0 w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 border-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all animate-fade-in"
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                        <div className="text-xs font-medium text-center mb-1 line-clamp-2">{file.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg hover:scale-110 transition-transform"
                        onClick={() => {
                          const newFiles = [...mediaFiles];
                          newFiles.splice(index, 1);
                          setMediaFiles(newFiles);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {mediaFiles.length < 6 && (
                    <div className="flex-shrink-0 w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-accent hover:border-primary transition-all group">
                      <label
                        htmlFor="media-upload"
                        className="cursor-pointer w-full h-full flex flex-col items-center justify-center"
                      >
                        <Plus className="w-8 h-8 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                          Add Media
                        </span>
                      </label>
                      <input
                        id="media-upload"
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 20 * 1024 * 1024) {
                              toast({
                                title: "File too large",
                                description: "Maximum file size is 20MB",
                                variant: "destructive",
                              });
                              return;
                            }
                            setMediaFiles([...mediaFiles, file]);
                          }
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click + to add images or videos (max 20MB each, up to 6 files)
                </p>
              </div>

              {/* Free Accessories */}
              <div className="space-y-2">
                <Label>Bundle accessories with cycle</Label>
                <Popover open={accessoryPopoverOpen} onOpenChange={setAccessoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Accessory
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search accessories..."
                        value={accessorySearch}
                        onValueChange={setAccessorySearch}
                      />
                      <CommandEmpty>No accessory found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {filteredAccessories.map((acc) => (
                          <CommandItem key={acc.id} value={acc.name} onSelect={() => addAccessory(acc.id)}>
                            {acc.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(formData.free_accessories || []).map((accId) => {
                    const acc = accessories.find((a) => a.id === accId);
                    return acc ? (
                      <Badge key={accId} variant="secondary" className="gap-1">
                        {acc.name}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeAccessory(accId)} />
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Specifications */}
              <div className="space-y-2">
                <Label>Specifications</Label>
                <div className="relative">
                  <Input
                    placeholder="Start typing to search specifications..."
                    value={specInput}
                    onChange={(e) => {
                      setSpecInput(e.target.value);
                      setShowSpecSuggestions(e.target.value.length > 0);
                    }}
                    onFocus={() => specInput && setShowSpecSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSpecSuggestions(false), 200)}
                  />
                  {showSpecSuggestions && filteredSpecs.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredSpecs.map((spec, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                          onClick={() => addSpecification(spec)}
                        >
                          {spec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(formData.specifications || "")
                    .split("\n")
                    .filter((s) => s.trim())
                    .map((spec, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {spec}
                        <X className="w-3 h-3 cursor-pointer" onClick={() => removeSpecification(spec)} />
                      </Badge>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground">Type to search and add specifications</p>
              </div>

              {/* Internal Details */}
              <div className="space-y-4 border p-4 rounded-lg bg-accent/20">
                <Label className="text-base font-semibold">Internal Details (Admin Only)</Label>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serial_number">Serial Number</Label>
                    <Input
                      id="serial_number"
                      value={formData.serial_number || ""}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="Unique serial number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model_number">Model Number</Label>
                    <Input
                      id="model_number"
                      value={formData.model_number || ""}
                      onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                      placeholder="Manufacturer model #"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input
                      id="vendor"
                      value={formData.internal_details?.vendor || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          internal_details: {
                            ...(formData.internal_details || {}),
                            vendor: e.target.value,
                          },
                        })
                      }
                      placeholder="Vendor name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_received">Date Received</Label>
                    <Input
                      id="date_received"
                      type="date"
                      value={formData.internal_details?.date_received || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          internal_details: {
                            ...(formData.internal_details || {}),
                            date_received: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchase_amount">Purchase Amount (₹)</Label>
                    <Input
                      id="purchase_amount"
                      type="number"
                      value={formData.internal_details?.purchase_amount || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          internal_details: {
                            ...(formData.internal_details || {}),
                            purchase_amount: Number(e.target.value),
                          },
                        })
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warranty">Warranty Period</Label>
                    <Input
                      id="warranty"
                      value={formData.internal_details?.warranty || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          internal_details: {
                            ...(formData.internal_details || {}),
                            warranty: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., 1 year"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <FileUpload
                    label="Warranty Document"
                    accept="application/pdf,image/*"
                    onFileSelect={(file) => setWarrantyFile(file)}
                    maxSize={10}
                    description="PDF or Image"
                  />

                  <FileUpload
                    label="Invoice Document"
                    accept="application/pdf,image/*"
                    onFileSelect={(file) => setInvoiceFile(file)}
                    maxSize={10}
                    description="PDF or Image"
                  />

                  <FileUpload
                    label="User Manual"
                    accept="application/pdf,image/*"
                    onFileSelect={(file) => setUserManualFile(file)}
                    maxSize={10}
                    description="PDF or Image"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice">Invoice Number</Label>
                  <Input
                    id="invoice"
                    value={formData.internal_details?.invoice || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internal_details: {
                          ...(formData.internal_details || {}),
                          invoice: e.target.value,
                        },
                      })
                    }
                    placeholder="Invoice number"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_per_day">Price/Day (₹) *</Label>
                  <Input
                    id="price_per_day"
                    type="number"
                    value={formData.price_per_day}
                    onChange={(e) => setFormData({ ...formData, price_per_day: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_week">Price/Week (₹) *</Label>
                  <Input
                    id="price_per_week"
                    type="number"
                    value={formData.price_per_week}
                    onChange={(e) => setFormData({ ...formData, price_per_week: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_month">Price/Month (₹)</Label>
                  <Input
                    id="price_per_month"
                    type="number"
                    value={formData.price_per_month || ""}
                    onChange={(e) => setFormData({ ...formData, price_per_month: Number(e.target.value) || null })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deposit_day">Deposit/Day (₹) *</Label>
                  <Input
                    id="deposit_day"
                    type="number"
                    value={formData.security_deposit_day}
                    onChange={(e) => setFormData({ ...formData, security_deposit_day: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_week">Deposit/Week (₹) *</Label>
                  <Input
                    id="deposit_week"
                    type="number"
                    value={formData.security_deposit_week}
                    onChange={(e) => setFormData({ ...formData, security_deposit_week: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_month">Deposit/Month (₹) *</Label>
                  <Input
                    id="deposit_month"
                    type="number"
                    value={formData.security_deposit_month}
                    onChange={(e) => setFormData({ ...formData, security_deposit_month: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={uploadingImage}>
                {uploadingImage ? "Saving..." : editingCycle ? "Update Cycle" : "Create Cycle"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search cycles by name or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>All Cycles ({filteredCycles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial</TableHead>
                <TableHead>Name/Model</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Deposits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCycles.map((cycle) => {
                return (
                  <TableRow key={cycle.id}>
                    <TableCell>
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {cycle.display_serial}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{cycle.name}</p>
                        <p className="text-sm text-muted-foreground">{cycle.model}</p>
                        {cycle.free_accessories && cycle.free_accessories.length > 0 && (
                          <p className="text-xs text-primary mt-1">+{cycle.free_accessories.length} free accessories</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>Day: ₹{cycle.price_per_day}</p>
                        <p>Week: ₹{cycle.price_per_week}</p>
                        {cycle.price_per_month && <p>Month: ₹{cycle.price_per_month}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>Day: ₹{cycle.security_deposit_day}</p>
                        <p>Week: ₹{cycle.security_deposit_week}</p>
                        <p>Month: ₹{cycle.security_deposit_month}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cycle.is_active ? "default" : "secondary"}>
                        {cycle.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(cycle)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(cycle)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(cycle)}>
                            {cycle.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(cycle.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cycles;
