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
import { Bike, Plus, Pencil, Trash2 } from "lucide-react";

interface Cycle {
  id: string;
  name: string;
  model: string;
  description: string | null;
  image_url: string | null;
  price_per_day: number;
  price_per_week: number;
  price_per_month: number | null;
  security_deposit_day: number;
  security_deposit_week: number;
  security_deposit_month: number;
  total_quantity: number;
  available_quantity: number;
  is_active: boolean;
}

const Cycles = () => {
  const { toast } = useToast();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Partial<Cycle>>({
    name: "",
    model: "",
    description: "",
    image_url: "",
    price_per_day: 0,
    price_per_week: 0,
    price_per_month: 0,
    security_deposit_day: 2000,
    security_deposit_week: 3000,
    security_deposit_month: 5000,
    total_quantity: 0,
    available_quantity: 0,
    is_active: true,
  });

  useEffect(() => {
    loadCycles();
  }, []);

  const loadCycles = async () => {
    try {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCycles(data || []);
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
      .from('cycles')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('cycles')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingImage(true);
    
    try {
      let imageUrl = formData.image_url;

      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      if (editingCycle) {
        const { error } = await supabase
          .from('cycles')
          .update({ ...formData, image_url: imageUrl })
          .eq('id', editingCycle.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Cycle updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('cycles')
          .insert([{ 
            name: formData.name!,
            model: formData.model!,
            description: formData.description || null,
            image_url: imageUrl || null,
            price_per_hour: 0,
            price_per_day: formData.price_per_day!,
            price_per_week: formData.price_per_week!,
            price_per_month: formData.price_per_month || null,
            security_deposit_day: formData.security_deposit_day!,
            security_deposit_week: formData.security_deposit_week!,
            security_deposit_month: formData.security_deposit_month!,
            total_quantity: formData.total_quantity!,
            available_quantity: formData.available_quantity!,
            is_active: formData.is_active!,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Cycle created successfully",
        });
      }

      setDialogOpen(false);
      setEditingCycle(null);
      setImageFile(null);
      setFormData({
        name: "",
        model: "",
        description: "",
        image_url: "",
        price_per_day: 0,
        price_per_week: 0,
        price_per_month: 0,
        security_deposit_day: 2000,
        security_deposit_week: 3000,
        security_deposit_month: 5000,
        total_quantity: 0,
        available_quantity: 0,
        is_active: true,
      });
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

  const handleEdit = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setFormData(cycle);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cycle?")) return;

    try {
      const { error } = await supabase
        .from('cycles')
        .delete()
        .eq('id', id);

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
      const { error } = await supabase
        .from('cycles')
        .update({ is_active: !cycle.is_active })
        .eq('id', cycle.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Cycle ${!cycle.is_active ? 'activated' : 'deactivated'}`,
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
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Add Cycle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCycle ? 'Edit Cycle' : 'Add New Cycle'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  value={formData.image_url || ""}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>

              <FileUpload
                label="Upload Cycle Image"
                accept="image/*"
                onFileSelect={(file) => setImageFile(file)}
                maxSize={5}
                description="Upload a cycle image (max 5MB)"
              />

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_per_day">Price/Day (₹) *</Label>
                  <Input
                    id="price_per_day"
                    type="number"
                    value={formData.price_per_day}
                    onChange={(e) => setFormData({...formData, price_per_day: Number(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_week">Price/Week (₹) *</Label>
                  <Input
                    id="price_per_week"
                    type="number"
                    value={formData.price_per_week}
                    onChange={(e) => setFormData({...formData, price_per_week: Number(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_per_month">Price/Month (₹)</Label>
                  <Input
                    id="price_per_month"
                    type="number"
                    value={formData.price_per_month || ""}
                    onChange={(e) => setFormData({...formData, price_per_month: Number(e.target.value) || null})}
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
                    onChange={(e) => setFormData({...formData, security_deposit_day: Number(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_week">Deposit/Week (₹) *</Label>
                  <Input
                    id="deposit_week"
                    type="number"
                    value={formData.security_deposit_week}
                    onChange={(e) => setFormData({...formData, security_deposit_week: Number(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_month">Deposit/Month (₹) *</Label>
                  <Input
                    id="deposit_month"
                    type="number"
                    value={formData.security_deposit_month}
                    onChange={(e) => setFormData({...formData, security_deposit_month: Number(e.target.value)})}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_quantity">Total Quantity *</Label>
                  <Input
                    id="total_quantity"
                    type="number"
                    value={formData.total_quantity}
                    onChange={(e) => setFormData({...formData, total_quantity: Number(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="available_quantity">Available Quantity *</Label>
                  <Input
                    id="available_quantity"
                    type="number"
                    value={formData.available_quantity}
                    onChange={(e) => setFormData({...formData, available_quantity: Number(e.target.value)})}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90">
                {editingCycle ? 'Update Cycle' : 'Create Cycle'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>All Cycles ({cycles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name/Model</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Deposits</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => (
                <TableRow key={cycle.id}>
                  <TableCell>
                    <div>
                      <p className="font-semibold">{cycle.name}</p>
                      <p className="text-sm text-muted-foreground">{cycle.model}</p>
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
                    {cycle.available_quantity} / {cycle.total_quantity}
                  </TableCell>
                  <TableCell>
                    <Badge variant={cycle.is_active ? "default" : "secondary"}>
                      {cycle.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(cycle)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleActive(cycle)}
                      >
                        {cycle.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(cycle.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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

export default Cycles;