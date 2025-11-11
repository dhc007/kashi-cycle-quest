import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/admin/RoleGuard";
import { Package, CheckCircle2, AlertCircle, X, Eye, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface ActiveBooking {
  id: string;
  booking_id: string;
  user_id: string;
  pickup_date: string;
  return_date: string;
  total_amount: number;
  security_deposit: number;
  cycle_returned_at: string | null;
  cycle_inspected_at: string | null;
  cycle_condition: string | null;
  deposit_returned_at: string | null;
  deposit_refund_amount: number;
  late_fee: number;
  profiles: {
    full_name: string;
    phone_number: string;
  } | null;
  cycles: {
    name: string;
    model: string;
  } | null;
}

const CycleReturnContent = () => {
  const [bookings, setBookings] = useState<ActiveBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<ActiveBooking | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cycleCondition, setCycleCondition] = useState<string>("");
  const [damageCost, setDamageCost] = useState<string>("0");
  const [damageDescription, setDamageDescription] = useState<string>("");
  const [returnPhotos, setReturnPhotos] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<ActiveBooking | null>(null);
  const { toast } = useToast();

  const handlePhotoSelect = (files: File[]) => {
    if (files.length + returnPhotos.length > 6) {
      toast({
        title: "Too many files",
        description: "Maximum 6 photos allowed",
        variant: "destructive",
      });
      return;
    }
    setReturnPhotos([...returnPhotos, ...files].slice(0, 6));
  };

  const removePhoto = (index: number) => {
    setReturnPhotos(returnPhotos.filter((_, i) => i !== index));
  };

  useEffect(() => {
    loadActiveBookings();
  }, []);

  const loadActiveBookings = async () => {
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_status', 'active')
        .order('return_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      // Fetch related data separately
      const bookingsWithRelations = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const [profileResult, cycleResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, phone_number')
              .eq('user_id', booking.user_id)
              .single(),
            supabase
              .from('cycles')
              .select('name, model')
              .eq('id', booking.cycle_id)
              .single()
          ]);

          return {
            ...booking,
            profiles: profileResult.data,
            cycles: cycleResult.data
          };
        })
      );

      setBookings(bookingsWithRelations);
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

  const openReturnDialog = (booking: ActiveBooking) => {
    setSelectedBooking(booking);
    setCycleCondition(booking.cycle_condition || "good");
    setDamageCost("0");
    setDamageDescription("");
    setReturnPhotos([]);
    setDialogOpen(true);
  };

  const calculateLateFee = (returnDate: string): number => {
    const expectedReturn = new Date(returnDate);
    const now = new Date();
    
    if (now <= expectedReturn) return 0;

    const hoursLate = Math.ceil((now.getTime() - expectedReturn.getTime()) / (1000 * 60 * 60));
    return hoursLate * 50; // ₹50 per hour late
  };

  const handleCycleReturn = async () => {
    if (!selectedBooking) return;

    if (returnPhotos.length === 0) {
      toast({
        title: "Photos Required",
        description: "Please upload at least 1 photo of the cycle condition",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const lateFee = calculateLateFee(selectedBooking.return_date);
      const damage = parseFloat(damageCost);
      const depositRefund = selectedBooking.security_deposit - lateFee - damage;

      // Upload photos if any
      let photoUrls: string[] = [];
      if (returnPhotos.length > 0) {
        toast({
          title: "Uploading photos...",
          description: "Please wait",
        });

        for (const photo of returnPhotos) {
          const fileName = `${selectedBooking.id}_${Date.now()}_${photo.name}`;
          const { error: uploadError } = await supabase.storage
            .from('booking-documents')
            .upload(fileName, photo);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('booking-documents')
            .getPublicUrl(fileName);

          photoUrls.push(publicUrl);
        }
      }

      // Mark cycle as returned and inspected
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          cycle_returned_at: new Date().toISOString(),
          cycle_inspected_at: new Date().toISOString(),
          cycle_condition: cycleCondition,
          late_fee: lateFee,
          return_photos: photoUrls,
          booking_status: lateFee > 0 || damage > 0 ? 'active' : 'completed',
        })
        .eq('id', selectedBooking.id);

      if (updateError) throw updateError;

      // Create damage report if applicable
      if (damage > 0 && damageDescription) {
        const { data: cycleData } = await supabase
          .from('bookings')
          .select('cycle_id')
          .eq('id', selectedBooking.id)
          .single();

        if (cycleData) {
          const { data: { user } } = await supabase.auth.getUser();
          
          await supabase
            .from('damage_reports')
            .insert({
              booking_id: selectedBooking.id,
              cycle_id: cycleData.cycle_id,
              damage_description: damageDescription,
              damage_cost: damage,
              deducted_from_deposit: depositRefund >= 0,
              created_by: user?.id,
            });
        }
      }

      toast({
        title: "Success",
        description: `Cycle returned successfully. ${lateFee > 0 ? `Late fee: ₹${lateFee}. ` : ''}${damage > 0 ? `Damage cost: ₹${damage}. ` : ''}Deposit refund: ₹${depositRefund}`,
      });

      setDialogOpen(false);
      loadActiveBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDepositReturn = async (booking: ActiveBooking) => {
    setProcessing(true);
    try {
      const lateFee = booking.late_fee || 0;
      const { data: damageReports } = await supabase
        .from('damage_reports')
        .select('damage_cost')
        .eq('booking_id', booking.id);

      const totalDamage = damageReports?.reduce((sum, d) => sum + Number(d.damage_cost), 0) || 0;
      const refundAmount = booking.security_deposit - lateFee - totalDamage;

      const { error } = await supabase
        .from('bookings')
        .update({
          deposit_returned_at: new Date().toISOString(),
          deposit_refund_amount: refundAmount,
          booking_status: 'completed',
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deposit of ₹${refundAmount} marked as returned. Process refund through payment gateway.`,
      });

      loadActiveBookings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Cycle Returns & Deposit Management</h1>
        <p className="text-muted-foreground">Process cycle returns and manage security deposits</p>
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Active Bookings Pending Return
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Security Deposit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length > 0 ? (
                bookings.map((booking) => {
                  const isOverdue = new Date() > new Date(booking.return_date);
                  const lateFee = calculateLateFee(booking.return_date);
                  
                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono">{booking.booking_id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{booking.profiles?.full_name}</div>
                          <div className="text-xs text-muted-foreground">{booking.profiles?.phone_number}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {booking.cycles?.name}
                          <div className="text-xs text-muted-foreground">{booking.cycles?.model}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={isOverdue ? "text-red-600 font-semibold" : ""}>
                          {format(new Date(booking.return_date), 'MMM dd, yyyy')}
                          {isOverdue && (
                            <div className="text-xs">Overdue: ₹{lateFee} late fee</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {booking.cycle_returned_at ? (
                          booking.deposit_returned_at ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
                              Completed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-blue-600">
                              <AlertCircle className="w-4 h-4" />
                              Deposit Pending
                            </span>
                          )
                        ) : (
                          <span className="flex items-center gap-1 text-orange-600">
                            <AlertCircle className="w-4 h-4" />
                            Not Returned
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">₹{booking.security_deposit}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setViewingBooking(booking);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!booking.cycle_returned_at && (
                                <DropdownMenuItem onClick={() => openReturnDialog(booking)}>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Mark Returned
                                </DropdownMenuItem>
                              )}
                              {booking.cycle_returned_at && !booking.deposit_returned_at && (
                                <DropdownMenuItem onClick={() => handleDepositReturn(booking)} disabled={processing}>
                                  Return Deposit
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No active bookings pending return
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Process Cycle Return</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Customer</Label>
                  <div className="font-medium">{selectedBooking.profiles?.full_name}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Booking ID</Label>
                  <div className="font-mono">{selectedBooking.booking_id}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Security Deposit</Label>
                  <div className="font-semibold">₹{selectedBooking.security_deposit}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Late Fee</Label>
                  <div className="font-semibold text-red-600">
                    ₹{calculateLateFee(selectedBooking.return_date)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cycle Condition *</Label>
                <Select value={cycleCondition} onValueChange={setCycleCondition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair (Minor wear)</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Upload Photos * (Max 6, Required for all conditions)</Label>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    handlePhotoSelect(files);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {returnPhotos.length}/6 files selected. At least 1 photo required.
                </p>
                {returnPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {returnPhotos.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Photo ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {(cycleCondition === "damaged" || cycleCondition === "fair") && (
                <>
                  <div className="space-y-2">
                    <Label>Damage Cost (₹)</Label>
                    <Input
                      type="number"
                      value={damageCost}
                      onChange={(e) => setDamageCost(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Damage Description *</Label>
                    <Textarea
                      value={damageDescription}
                      onChange={(e) => setDamageDescription(e.target.value)}
                      placeholder="Describe the damage or wear..."
                      rows={3}
                    />
                  </div>
                </>
              )}

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Security Deposit:</span>
                  <span className="font-semibold">₹{selectedBooking.security_deposit}</span>
                </div>
                <div className="flex justify-between items-center mb-2 text-red-600">
                  <span className="text-sm">Late Fee:</span>
                  <span className="font-semibold">-₹{calculateLateFee(selectedBooking.return_date)}</span>
                </div>
                <div className="flex justify-between items-center mb-2 text-red-600">
                  <span className="text-sm">Damage Cost:</span>
                  <span className="font-semibold">-₹{damageCost}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-primary/20">
                  <span className="font-semibold">Refund Amount:</span>
                  <span className="text-lg font-bold text-primary">
                    ₹{selectedBooking.security_deposit - calculateLateFee(selectedBooking.return_date) - parseFloat(damageCost || "0")}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCycleReturn} disabled={processing}>
                  {processing ? "Processing..." : "Confirm Return"}
                </Button>
              </div>
            </div>
          )}
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            {viewingBooking && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Booking ID</Label>
                    <p className="font-mono">{viewingBooking.booking_id}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Customer</Label>
                    <p className="font-medium">{viewingBooking.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{viewingBooking.profiles?.phone_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cycle</Label>
                    <p>{viewingBooking.cycles?.name}</p>
                    <p className="text-xs text-muted-foreground">{viewingBooking.cycles?.model}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Return Date</Label>
                    <p>{format(new Date(viewingBooking.return_date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Security Deposit</Label>
                    <p className="font-semibold">₹{viewingBooking.security_deposit}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Late Fee</Label>
                    <p className="font-semibold text-red-600">₹{calculateLateFee(viewingBooking.return_date)}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };
  
  const CycleReturn = () => {
    return (
      <RoleGuard allowedRoles={['admin', 'manager']}>
        <CycleReturnContent />
      </RoleGuard>
    );
  };
  
  export default CycleReturn;
