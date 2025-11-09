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
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Accessory {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_per_day: number;
  total_quantity: number;
  available_quantity: number;
  is_active: boolean;
}

const AccessoriesContent = () => {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
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

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('accessories')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('accessories')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSave = async () => {
    setUploadingImage(true);
    try {
      let imageUrl = formData.image_url;

      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
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
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('accessories')
          .insert([{
            name: formData.name!,
            description: formData.description || null,
            image_url: imageUrl || null,
            price_per_day: formData.price_per_day!,
            total_quantity: formData.total_quantity!,
            available_quantity: formData.available_quantity!,
            is_active: formData.is_active ?? true,
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
                <TableHead>Name</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Price/Day</TableHead>
                <TableHead>Total Qty</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessories.map((accessory) => (
                <TableRow key={accessory.id}>
                  <TableCell className="font-medium">{accessory.name}</TableCell>
                  <TableCell>
                    {accessory.image_url ? (
                      <img src={accessory.image_url} alt={accessory.name} className="h-10 w-10 object-cover rounded" />
                    ) : (
                      <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-xs">
                        No img
                      </div>
                    )}
                  </TableCell>
                  <TableCell>₹{accessory.price_per_day}</TableCell>
                  <TableCell>{accessory.total_quantity}</TableCell>
                  <TableCell>{accessory.available_quantity}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${accessory.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {accessory.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(accessory)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(accessory.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
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
