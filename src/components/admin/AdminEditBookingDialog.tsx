import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface AdminEditBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    booking_id: string;
    pickup_date: string;
    return_date: string;
    pickup_time: string;
    return_time: string;
    booking_status: string;
    payment_status: string;
    total_amount: number;
    cycle_rental_cost: number;
    accessories_cost: number;
    security_deposit: number;
    gst: number;
    notes?: string;
  } | null;
  onSuccess: () => void;
}

export const AdminEditBookingDialog = ({
  open,
  onOpenChange,
  booking,
  onSuccess,
}: AdminEditBookingDialogProps) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    pickup_date: "",
    return_date: "",
    pickup_time: "",
    return_time: "",
    booking_status: "",
    payment_status: "",
    total_amount: 0,
    cycle_rental_cost: 0,
    accessories_cost: 0,
    security_deposit: 0,
    gst: 0,
    notes: "",
  });

  useEffect(() => {
    if (booking && open) {
      setFormData({
        pickup_date: booking.pickup_date,
        return_date: booking.return_date,
        pickup_time: booking.pickup_time || "10:00",
        return_time: booking.return_time || "10:00",
        booking_status: booking.booking_status,
        payment_status: booking.payment_status,
        total_amount: booking.total_amount,
        cycle_rental_cost: booking.cycle_rental_cost,
        accessories_cost: booking.accessories_cost,
        security_deposit: booking.security_deposit,
        gst: booking.gst,
        notes: booking.notes || "",
      });
    }
  }, [booking, open]);

  const handleSubmit = async () => {
    if (!booking) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          pickup_date: formData.pickup_date,
          return_date: formData.return_date,
          pickup_time: formData.pickup_time,
          return_time: formData.return_time,
          booking_status: formData.booking_status,
          payment_status: formData.payment_status,
          total_amount: formData.total_amount,
          cycle_rental_cost: formData.cycle_rental_cost,
          accessories_cost: formData.accessories_cost,
          security_deposit: formData.security_deposit,
          gst: formData.gst,
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Booking updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
          <DialogDescription>
            Booking ID: {booking.booking_id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dates and Times */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickup_date">Pickup Date</Label>
              <Input
                id="pickup_date"
                type="date"
                value={formData.pickup_date}
                onChange={(e) => setFormData({ ...formData, pickup_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pickup_time">Pickup Time</Label>
              <Input
                id="pickup_time"
                type="time"
                value={formData.pickup_time}
                onChange={(e) => setFormData({ ...formData, pickup_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return_date">Return Date</Label>
              <Input
                id="return_date"
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return_time">Return Time</Label>
              <Input
                id="return_time"
                type="time"
                value={formData.return_time}
                onChange={(e) => setFormData({ ...formData, return_time: e.target.value })}
              />
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Booking Status</Label>
              <Select
                value={formData.booking_status}
                onValueChange={(value) => setFormData({ ...formData, booking_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cycle_rental_cost">Cycle Rental Cost (₹)</Label>
              <Input
                id="cycle_rental_cost"
                type="number"
                step="0.01"
                value={formData.cycle_rental_cost}
                onChange={(e) => setFormData({ ...formData, cycle_rental_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessories_cost">Accessories Cost (₹)</Label>
              <Input
                id="accessories_cost"
                type="number"
                step="0.01"
                value={formData.accessories_cost}
                onChange={(e) => setFormData({ ...formData, accessories_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="security_deposit">Security Deposit (₹)</Label>
              <Input
                id="security_deposit"
                type="number"
                step="0.01"
                value={formData.security_deposit}
                onChange={(e) => setFormData({ ...formData, security_deposit: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst">GST (₹)</Label>
              <Input
                id="gst"
                type="number"
                step="0.01"
                value={formData.gst}
                onChange={(e) => setFormData({ ...formData, gst: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="total_amount">Total Amount (₹)</Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Admin Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add internal notes about this booking..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
