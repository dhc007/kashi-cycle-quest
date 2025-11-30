import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
            price_per_day: 0,
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
    try {
      // Check if accessory is referenced in active or upcoming bookings (not cancelled or completed)
      const { data: activeBookingAccessories, error: checkError } = await supabase
        .from('booking_accessories')
        .select('id, booking:bookings!inner(id, booking_status)')
        .eq('accessory_id', id)
        .in('booking.booking_status', ['confirmed', 'active'])
        .limit(1);

      if (checkError) throw checkError;

      if (activeBookingAccessories && activeBookingAccessories.length > 0) {
        toast({
          title: "Cannot Delete Accessory",
          description: "This accessory has active or upcoming bookings. You can deactivate it instead.",
          variant: "destructive",
        });
        return;
      }

      if (!confirm("Are you sure you want to delete this accessory? This will also remove booking history references.")) return;

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
                <TableHead className="w-[100px]">Actions</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessories.map((accessory) => (
                <TableRow key={accessory.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Accessory Details - {accessory.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            {/* Image */}
                            {accessory.image_url && (
                              <img src={accessory.image_url} alt={accessory.name} className="w-full h-48 object-cover rounded" />
                            )}
                            
                            {/* Basic Info */}
                            <div className="space-y-2">
                              <h3 className="font-semibold text-sm text-primary border-b pb-1">Basic Information</h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Display Serial</Label>
                                  <p className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block">{accessory.display_serial || '-'}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Name</Label>
                                  <p className="font-semibold">{accessory.name}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Status</Label>
                                  <Badge variant={accessory.is_active ? 'default' : 'secondary'}>
                                    {accessory.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Serial Number</Label>
                                  <p>{accessory.serial_number || '-'}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Model Number</Label>
                                  <p>{accessory.model_number || '-'}</p>
                                </div>
                                <div className="col-span-2 md:col-span-3">
                                  <Label className="text-xs text-muted-foreground">Description</Label>
                                  <p className="text-sm">{accessory.description || 'No description'}</p>
                                </div>
                              </div>
                            </div>

                            {/* Pricing & Inventory */}
                            <div className="space-y-2">
                              <h3 className="font-semibold text-sm text-primary border-b pb-1">Pricing & Inventory</h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Price/Day</Label>
                                  <p className="font-semibold text-lg">₹{accessory.price_per_day}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Security Deposit</Label>
                                  <p className="font-semibold">₹{(accessory as any).security_deposit || 0}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Total Quantity</Label>
                                  <p className="font-semibold">{accessory.total_quantity}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Available Quantity</Label>
                                  <p className="font-semibold text-green-600">{accessory.available_quantity}</p>
                                </div>
                              </div>
                            </div>

                            {/* Internal Details (Admin Only) */}
                            <div className="space-y-2 bg-accent/20 p-4 rounded-lg">
                              <h3 className="font-semibold text-sm text-primary border-b pb-1">Internal Details (Admin Only)</h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Vendor Name</Label>
                                  <p>{accessory.internal_details?.vendor_name || '-'}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Date of Purchase</Label>
                                  <p>{accessory.internal_details?.date_of_purchase || '-'}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Purchase Amount</Label>
                                  <p>{accessory.internal_details?.purchase_amount ? `₹${accessory.internal_details.purchase_amount}` : '-'}</p>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Legacy Model Number</Label>
                                  <p>{accessory.internal_details?.model_number || '-'}</p>
                                </div>
                              </div>
                            </div>

                            {/* Documents */}
                            <div className="space-y-2">
                              <h3 className="font-semibold text-sm text-primary border-b pb-1">Documents</h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Warranty Document</Label>
                                  {accessory.internal_details?.warranty_file_url ? (
                                    <a 
                                      href={accessory.internal_details.warranty_file_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline block"
                                    >
                                      View Warranty
                                    </a>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Not uploaded</p>
                                  )}
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Invoice Document</Label>
                                  {accessory.internal_details?.invoice_file_url ? (
                                    <a 
                                      href={accessory.internal_details.invoice_file_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline block"
                                    >
                                      View Invoice
                                    </a>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Not uploaded</p>
                                  )}
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">User Manual</Label>
                                  {accessory.user_manual_url ? (
                                    <a 
                                      href={accessory.user_manual_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline block"
                                    >
                                      View Manual
                                    </a>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Not uploaded</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => openEditDialog(accessory)}>
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
                  <TableCell>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {accessory.display_serial}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold">{accessory.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {accessory.model_number || '-'}
                  </TableCell>
                  <TableCell>
                    {accessory.image_url ? (
                      <img src={accessory.image_url} alt={accessory.name} className="w-16 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs">
                        No img
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      {accessory.available_quantity} / {accessory.total_quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={accessory.is_active ? 'default' : 'secondary'}>
                      {accessory.is_active ? 'Active' : 'Inactive'}
                    </Badge>
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
