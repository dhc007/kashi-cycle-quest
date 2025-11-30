import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard, useUserRoles } from "@/components/admin/RoleGuard";
import { Plus, Pencil, Trash2, QrCode, MoreVertical, Download, Copy, BarChart3, Eye } from "lucide-react";
import { FileUpload } from "@/components/FileUpload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import QRCode from "react-qr-code";

interface Partner {
  id: string;
  name: string;
  email: string | null;
  phone_number: string;
  address: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  google_maps_link: string | null;
  latitude: number | null;
  longitude: number | null;
  partner_type: 'guest_house' | 'cafe/retail';
  partner_code: string;
  is_active: boolean;
  logo_url: string | null;
}

const PartnersContent = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerStats, setPartnerStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<Partial<Partner>>({});
  const { toast } = useToast();
  const { canEdit } = useUserRoles();

  useEffect(() => {
    loadPartners();
    loadPartnerStats();
  }, []);

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('name');

      if (error) throw error;
      setPartners((data || []) as Partner[]);
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

  const loadPartnerStats = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('partner_id')
        .not('partner_id', 'is', null);

      if (error) throw error;

      const stats: Record<string, number> = {};
      data?.forEach((booking) => {
        if (booking.partner_id) {
          stats[booking.partner_id] = (stats[booking.partner_id] || 0) + 1;
        }
      });

      setPartnerStats(stats);
    } catch (error) {
      console.error('Error loading partner stats:', error);
    }
  };

  const handleSave = async () => {
    try {
      // Clean and validate phone number - remove all non-digit characters
      const cleanPhone = formData.phone_number?.replace(/\D/g, '') || '';
      
      if (!cleanPhone || cleanPhone.length !== 10) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid 10-digit phone number",
          variant: "destructive",
        });
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from('partners')
          .update({
            name: formData.name,
            email: formData.email || null,
            phone_number: cleanPhone,
            address: formData.address,
            landmark: formData.landmark || null,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            google_maps_link: formData.google_maps_link || null,
            partner_type: formData.partner_type,
            is_active: formData.is_active,
            logo_url: formData.logo_url || null,
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Generate partner code
        const { data: newCode, error: codeError } = await supabase
          .rpc('generate_partner_code', { p_partner_type: formData.partner_type || 'cafe/retail' });

        if (codeError) throw codeError;

        const { error } = await supabase
          .from('partners')
          .insert([{
            name: formData.name!,
            email: formData.email || null,
            phone_number: cleanPhone,
            address: formData.address!,
            landmark: formData.landmark || null,
            city: formData.city!,
            state: formData.state!,
            pincode: formData.pincode!,
            google_maps_link: formData.google_maps_link || null,
            partner_type: formData.partner_type || 'cafe/retail',
            partner_code: newCode,
            is_active: formData.is_active ?? true,
            logo_url: formData.logo_url || null,
          }]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Partner ${editingId ? 'updated' : 'created'} successfully`,
      });

      loadPartners();
      setDialogOpen(false);
      setEditingId(null);
      setFormData({});
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    // Check if partner has any active or upcoming bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('partner_id', id)
      .in('booking_status', ['confirmed', 'active']);

    if (bookings && bookings.length > 0) {
      toast({
        title: "Cannot Delete Partner",
        description: "This partner has active or upcoming bookings. Please complete or cancel them first.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this partner?")) return;

    try {
      // Check if partner has any active or upcoming bookings
      const { data: activeBookings } = await supabase
        .from('bookings')
        .select('id, booking_status')
        .eq('partner_id', id)
        .in('booking_status', ['confirmed', 'active']);

      if (activeBookings && activeBookings.length > 0) {
        toast({
          title: "Cannot Delete Partner",
          description: `This partner has ${activeBookings.length} active or upcoming booking(s). Partners can only be deleted after all bookings are completed or cancelled.`,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Partner deleted successfully",
      });

      loadPartners();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (partner: Partner) => {
    setEditingId(partner.id);
    setFormData({
      name: partner.name,
      email: partner.email,
      phone_number: partner.phone_number,
      address: partner.address,
      landmark: partner.landmark,
      city: partner.city,
      state: partner.state,
      pincode: partner.pincode,
      google_maps_link: partner.google_maps_link,
      partner_type: partner.partner_type,
      is_active: partner.is_active,
      logo_url: partner.logo_url,
    });
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingId(null);
    setFormData({ 
      partner_type: 'cafe/retail',
      is_active: true 
    });
    setDialogOpen(true);
  };

  const showQRCode = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    setQrDialogOpen(true);
  };

  const getBookingUrl = (partnerId: string) => {
    return `${window.location.origin}/book?partner=${partnerId}`;
  };

  const downloadQRCode = () => {
    if (!selectedPartnerId) return;
    
    const svg = document.getElementById('partner-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = `partner-qr-${selectedPartnerId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const copyBookingLink = (partnerId: string) => {
    navigator.clipboard.writeText(getBookingUrl(partnerId));
    toast({ 
      title: "Link Copied!", 
      description: "Share this link with customers" 
    });
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Partners Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage partner relationships and QR codes</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Partner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Partner</DialogTitle>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone_number">Phone Number *</Label>
                    <Input
                      id="phone_number"
                      type="tel"
                      placeholder="10 digit phone number"
                      value={formData.phone_number || ''}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      pattern="[0-9]{10}"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="landmark">Landmark</Label>
                  <Input
                    id="landmark"
                    value={formData.landmark || ''}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state || ''}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode || ''}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="google_maps_link">Google Maps Link</Label>
                  <Input
                    id="google_maps_link"
                    type="url"
                    placeholder="https://maps.app.goo.gl/..."
                    value={formData.google_maps_link || ''}
                    onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="partner_type">Partner Type *</Label>
                  <select
                    id="partner_type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.partner_type || 'cafe/retail'}
                    onChange={(e) => setFormData({ ...formData, partner_type: e.target.value as 'guest_house' | 'cafe/retail' })}
                    required
                  >
                    <option value="cafe/retail">Cafe/Retail</option>
                    <option value="guest_house">Guest House/Stay</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Guest House: Pickup at partner location. Cafe/Retail: Pickup at Bolt 91 Base.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Partner Logo</Label>
                  <FileUpload
                    label=""
                    accept="image/*"
                    onFileSelect={async (file) => {
                      if (file) {
                        const fileName = `${Date.now()}-${file.name}`;
                        const { data, error } = await supabase.storage
                          .from('documents')
                          .upload(fileName, file);
                        
                        if (error) {
                          toast({
                            title: "Upload Error",
                            description: error.message,
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        const { data: urlData } = supabase.storage
                          .from('documents')
                          .getPublicUrl(fileName);
                        
                        setFormData({ ...formData, logo_url: urlData.publicUrl });
                      } else {
                        setFormData({ ...formData, logo_url: null });
                      }
                    }}
                    maxSize={5}
                    description="Upload partner logo (max 5MB)"
                  />
                  {formData.logo_url && (
                    <div className="mt-2">
                      <img src={formData.logo_url} alt="Partner logo" className="h-20 w-auto rounded-md border" />
                    </div>
                  )}
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
          <CardTitle>All Partners</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Actions</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => showQRCode(partner.id)}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => {
                              setSelectedPartner(partner);
                              setViewDialogOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(partner)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(partner.id)}
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
                    <Badge variant="secondary" className="font-mono">
                      {partner.partner_code}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={partner.partner_type === 'guest_house' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}>
                      {partner.partner_type === 'guest_house' ? 'Guest House' : 'Cafe/Retail'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {partner.city}, {partner.state}
                      <div className="text-xs text-muted-foreground">{partner.pincode}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {partner.phone_number}
                      {partner.email && <div className="text-xs text-muted-foreground">{partner.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary text-lg">
                        {partnerStats[partner.id] || 0}
                      </span>
                      {partnerStats[partner.id] > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/bookings?partner=${partner.id}`)}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${partner.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {partner.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Partner View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Partner Details</DialogTitle>
          </DialogHeader>
          {selectedPartner && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {selectedPartner.logo_url && (
                  <img 
                    src={selectedPartner.logo_url} 
                    alt={selectedPartner.name}
                    className="w-20 h-20 object-contain rounded border"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{selectedPartner.name}</h3>
                  <Badge variant="outline" className="mt-1">
                    {selectedPartner.partner_type === 'guest_house' ? 'Guest House' : 'Cafe/Retail'}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Partner Code</p>
                  <Badge variant="secondary" className="font-mono mt-1">
                    {selectedPartner.partner_code}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${selectedPartner.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {selectedPartner.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                  <p className="text-base">{selectedPartner.phone_number}</p>
                </div>
                {selectedPartner.email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-base">{selectedPartner.email}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p className="text-base">
                    {selectedPartner.address}
                    {selectedPartner.landmark && `, ${selectedPartner.landmark}`}
                  </p>
                  <p className="text-base">
                    {selectedPartner.city}, {selectedPartner.state} - {selectedPartner.pincode}
                  </p>
                </div>
                {selectedPartner.google_maps_link && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Google Maps</p>
                    <a 
                      href={selectedPartner.google_maps_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View on Google Maps
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                  <p className="text-lg font-semibold text-primary">
                    {partnerStats[selectedPartner.id] || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partner QR Code & Booking Link</DialogTitle>
          </DialogHeader>
          {selectedPartnerId && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-lg">
                <QRCode 
                  id="partner-qr-code"
                  value={getBookingUrl(selectedPartnerId)} 
                  size={256} 
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadQRCode}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code or share the link below to book with this partner
              </p>
              <div className="flex gap-2 w-full">
                <Input
                  readOnly
                  value={getBookingUrl(selectedPartnerId)}
                  className="text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyBookingLink(selectedPartnerId)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Partners = () => {
  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'viewer']}>
      <PartnersContent />
    </RoleGuard>
  );
};

export default Partners;
