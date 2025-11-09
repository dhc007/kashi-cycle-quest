import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Info } from "lucide-react";
import { differenceInHours } from "date-fns";

interface CancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  pickupDate: string;
  totalAmount: number;
  onSuccess: () => void;
}

export const CancellationDialog = ({
  open,
  onOpenChange,
  bookingId,
  pickupDate,
  totalAmount,
  onSuccess,
}: CancellationDialogProps) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const hoursUntilPickup = differenceInHours(new Date(pickupDate), new Date());
  const cancellationFee = hoursUntilPickup >= 24 ? 100 : totalAmount;
  const refundAmount = totalAmount - cancellationFee;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for cancellation",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('bookings')
        .update({
          cancellation_requested_at: new Date().toISOString(),
          cancellation_reason: reason,
          cancellation_status: 'requested',
          cancellation_fee: cancellationFee,
          refund_amount: refundAmount,
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Cancellation Requested",
        description: "Your cancellation request has been submitted for admin approval",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error requesting cancellation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to request cancellation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Booking Cancellation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Cancellation Policy</p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  {hoursUntilPickup >= 24 
                    ? `Cancelled 24+ hours before pickup: ₹100 cancellation fee`
                    : `Cancelled within 24 hours: No refund`}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Total Amount:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-100">₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">Cancellation Fee:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">-₹{cancellationFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">Refund Amount:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">₹{refundAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Cancellation *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for cancelling this booking..."
              rows={4}
              className="resize-none"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Your cancellation request will be reviewed by an admin. You will receive a confirmation once approved.
          </p>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Request Cancellation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};