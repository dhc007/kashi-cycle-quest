import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard, useUserRoles } from "@/components/admin/RoleGuard";
import { FileUpload } from "@/components/FileUpload";
import { Plus, Pencil, Trash2, MoreVertical, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Accessory {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_per_day: number;
  total_quantity: number;
  available_quantity: number;
  is_active: boolean;
  internal_details: any;
  serial_number?: string | null;
  model_number?: string | null;
  internal_tracking_id?: string | null;
  user_manual_url?: string | null;
  display_serial?: string | null;
}

const AccessoriesContent = () => {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [warrantyFile, setWarrantyFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [userManualFile, setUserManualFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState<Partial<Accessory>>({});
  const { toast } = useToast();
  const { canEdit } = useUserRoles();

  useEffect(() => {
    loadAccessories();
  }, []);

  const loadAccessories = async () => {
    try {
      const { data, error } = await supabase
        .from('accessories')
        .select('*')
        .order('name');

      if (error) throw error;
      setAccessories(data || []);
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

  const uploadFile = async (file: File, bucket: string = 'accessories'): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSave = async () => {
    setUploadingImage(true);
    try {
      let imageUrl = formData.image_url;
      let warrantyFileUrl = formData.internal_details?.warranty_file_url || "";
      let invoiceFileUrl = formData.internal_details?.invoice_file_url || "";
      let userManualUrl = formData.user_manual_url || "";

      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadFile(imageFile);
      }

      // Upload warranty file
      if (warrantyFile) {
        warrantyFileUrl = await uploadFile(warrantyFile, 'documents');
      }

      // Upload invoice file
      if (invoiceFile) {
        invoiceFileUrl = await uploadFile(invoiceFile, 'documents');
      }

      // Upload user manual file
      if (userManualFile) {
        userManualUrl = await uploadFile(userManualFile, 'documents');
      }

      if (editingId) {
        const { error } = await supabase
          .from('accessories')
          .update({
            name: formData.name,
            description: formData.description || null,
            image_url: imageUrl || null,
            price_per_day: formData.price_per_day,
            total_quantity: formData.total_quantity,
            available_quantity: formData.available_quantity,
            is_active: formData.is_active,
            serial_number: formData.serial_number || null,
            model_number: formData.model_number || null,
            user_manual_url: userManualUrl || null,
            internal_details: {
              ...(formData.internal_details || {}),
              warranty_file_url: warrantyFileUrl,
              invoice_file_url: invoiceFileUrl,
            }
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error} = await supabase
          .from('accessories')
          .insert([{
            name: formData.name!,
            description: formData.description || null,
            image_url: imageUrl || null,
            price_per_day: formData.price_per_day!,
            total_quantity: formData.total_quantity!,
            available_quantity: formData.available_quantity!,
            is_active: formData.is_active ?? true,
            serial_number: formData.serial_number || null,
            model_number: formData.model_number || null,
            user_manual_url: userManualUrl || null,
            internal_details: {
              ...(formData.internal_details || {}),
              warranty_file_url: warrantyFileUrl,
              invoice_file_url: invoiceFileUrl,
            }
          }]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Accessory ${editingId ? 'updated' : 'created'} successfully`,
      });

      loadAccessories();
      setDialogOpen(false);
      setEditingId(null);
      setImageFile(null);
      setWarrantyFile(null);
      setInvoiceFile(null);
      setUserManualFile(null);
      setFormData({});
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this accessory?")) return;

    try {
      const { error } = await supabase
        .from('accessories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Accessory deleted successfully",
      });

      loadAccessories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (accessory: Accessory) => {
    setEditingId(accessory.id);
    setFormData(accessory);
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingId(null);
    setFormData({
      is_active: true,
      total_quantity: 0,
      available_quantity: 0,
    });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Accessories Inventory</h1>
          <p className="text-muted-foreground">Manage rental accessories</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Accessory
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Accessory</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url || ''}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <FileUpload
                  label="Upload Accessory Image"
                  accept="image/*"
                  onFileSelect={(file) => setImageFile(file)}
                  maxSize={5}
                  description="Upload an accessory image (max 5MB)"
                />
                <div className="grid gap-2">
                  <Label htmlFor="price_per_day">Price per Day (₹) *</Label>
                  <Input
                    id="price_per_day"
                    type="number"
                    value={formData.price_per_day || ''}
                    onChange={(e) => setFormData({ ...formData, price_per_day: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="total_quantity">Total Quantity *</Label>
                    <Input
                      id="total_quantity"
                      type="number"
                      value={formData.total_quantity || ''}
                      onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="available_quantity">Available Quantity *</Label>
                    <Input
                      id="available_quantity"
                      type="number"
                      value={formData.available_quantity || ''}
                      onChange={(e) => setFormData({ ...formData, available_quantity: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Internal Details */}
                <div className="space-y-4 border p-4 rounded-lg bg-accent/20">
                  <Label className="text-base font-semibold">Internal Details (Admin Only)</Label>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="serial_number">Serial Number</Label>
                      <Input
                        id="serial_number"
                        value={formData.serial_number || ''}
                        onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                        placeholder="Unique serial number"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="model_number">Model Number</Label>
                      <Input
                        id="model_number"
                        value={formData.model_number || ''}
                        onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                        placeholder="Manufacturer model #"
                      />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="vendor_name">Vendor Name</Label>
                      <Input
                        id="vendor_name"
                        value={formData.internal_details?.vendor_name || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          internal_details: { 
                            ...(formData.internal_details || {}), 
                            vendor_name: e.target.value 
                          } 
                        })}
                        placeholder="Vendor name"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="old_model_number">Old Model Number</Label>
                      <Input
                        id="old_model_number"
                        value={formData.internal_details?.model_number || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          internal_details: { 
                            ...(formData.internal_details || {}), 
                            model_number: e.target.value 
                          } 
                        })}
                        placeholder="Legacy model number"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="date_of_purchase">Date of Purchase</Label>
                      <Input
                        id="date_of_purchase"
                        type="date"
                        value={formData.internal_details?.date_of_purchase || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          internal_details: { 
                            ...(formData.internal_details || {}), 
                            date_of_purchase: e.target.value 
                          } 
                        })}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="purchase_amount">Purchase Amount (₹)</Label>
                      <Input
                        id="purchase_amount"
                        type="number"
                        value={formData.internal_details?.purchase_amount || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          internal_details: { 
                            ...(formData.internal_details || {}), 
                            purchase_amount: Number(e.target.value) 
                          } 
                        })}
                        placeholder="0"
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
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>All Accessories</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price/Day</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessories.map((accessory) => (
                <TableRow key={accessory.id}>
                  <TableCell>
                    {accessory.image_url ? (
                      <img src={accessory.image_url} alt={accessory.name} className="h-12 w-12 object-cover rounded" />
                    ) : (
                      <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs">
                        No img
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {accessory.display_serial}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{accessory.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{accessory.description}</TableCell>
                  <TableCell>₹{accessory.price_per_day}</TableCell>
                  <TableCell>
                    {accessory.available_quantity} / {accessory.total_quantity}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${accessory.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {accessory.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(accessory.id);
                          setFormData(accessory);
                          setDialogOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingId(accessory.id);
                              setFormData(accessory);
                              setDialogOpen(true);
                            }}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(accessory.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const Accessories = () => {
  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'viewer']}>
      <AccessoriesContent />
    </RoleGuard>
  );
};

export default Accessories;
