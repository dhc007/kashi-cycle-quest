import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Minus } from "lucide-react";
import { differenceInDays } from "date-fns";

interface Accessory {
  id: string;
  name: string;
  price_per_day: number;
  image_url: string | null;
  available_quantity: number;
}

interface AddAccessoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  pickupDate: string;
  returnDate: string;
  onSuccess: () => void;
}

interface SelectedAccessory {
  id: string;
  quantity: number;
}

export function AddAccessoriesDialog({
  open,
  onOpenChange,
  bookingId,
  pickupDate,
  returnDate,
  onSuccess,
}: AddAccessoriesDialogProps) {
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<SelectedAccessory[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const days = Math.max(1, differenceInDays(new Date(returnDate), new Date(pickupDate)));

  useEffect(() => {
    if (open) {
      loadAccessories();
    }
  }, [open]);

  const loadAccessories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accessories')
        .select('id, name, price_per_day, image_url, available_quantity')
        .eq('is_active', true)
        .gt('available_quantity', 0);

      if (error) throw error;
      setAccessories(data || []);
    } catch (error) {
      console.error('Error loading accessories:', error);
      toast({
        title: "Error",
        description: "Failed to load accessories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (accessoryId: string, delta: number) => {
    setSelectedAccessories((prev) => {
      const existing = prev.find((a) => a.id === accessoryId);
      const accessory = accessories.find((a) => a.id === accessoryId);
      
      if (!accessory) return prev;

      if (!existing && delta > 0) {
        return [...prev, { id: accessoryId, quantity: 1 }];
      }

      return prev
        .map((a) => {
          if (a.id === accessoryId) {
            const newQuantity = a.quantity + delta;
            return { ...a, quantity: Math.max(0, Math.min(newQuantity, accessory.available_quantity)) };
          }
          return a;
        })
        .filter((a) => a.quantity > 0);
    });
  };

  const getQuantity = (accessoryId: string) => {
    return selectedAccessories.find((a) => a.id === accessoryId)?.quantity || 0;
  };

  const calculateTotal = () => {
    return selectedAccessories.reduce((total, selected) => {
      const accessory = accessories.find((a) => a.id === selected.id);
      if (!accessory) return total;
      return total + (accessory.price_per_day * selected.quantity * days);
    }, 0);
  };

  const calculateGST = (amount: number) => {
    return amount * 0.18;
  };

  const totalAmount = calculateTotal();
  const gstAmount = calculateGST(totalAmount);
  const grandTotal = totalAmount + gstAmount;

  const handlePayment = async () => {
    if (selectedAccessories.length === 0) {
      toast({
        title: "No accessories selected",
        description: "Please select at least one accessory",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: {
            amount: grandTotal,
            currency: 'INR',
            receipt: `addon_${bookingId}_${Date.now()}`,
          },
        }
      );

      if (orderError) throw orderError;

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Bolt91 Cycles',
        description: 'Add Accessories to Booking',
        order_id: orderData.order.id,
        handler: async (response: any) => {
          try {
            // Verify payment
            const { error: verifyError } = await supabase.functions.invoke(
              'verify-razorpay-payment',
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  booking_id: bookingId,
                  is_addon: true,
                },
              }
            );

            if (verifyError) throw verifyError;

            // Add accessories to booking
            const accessoriesToInsert = selectedAccessories.map((selected) => {
              const accessory = accessories.find((a) => a.id === selected.id)!;
              return {
                booking_id: bookingId,
                accessory_id: selected.id,
                quantity: selected.quantity,
                days: days,
                price_per_day: accessory.price_per_day,
                total_cost: accessory.price_per_day * selected.quantity * days,
              };
            });

            const { error: insertError } = await supabase
              .from('booking_accessories')
              .insert(accessoriesToInsert);

            if (insertError) throw insertError;

            // Update booking total
            const { data: bookingData, error: fetchError } = await supabase
              .from('bookings')
              .select('accessories_cost, total_amount')
              .eq('id', bookingId)
              .single();

            if (fetchError) throw fetchError;

            const { error: updateError } = await supabase
              .from('bookings')
              .update({
                accessories_cost: (bookingData.accessories_cost || 0) + totalAmount,
                total_amount: bookingData.total_amount + grandTotal,
              })
              .eq('id', bookingId);

            if (updateError) throw updateError;

            toast({
              title: "Success",
              description: "Accessories added successfully",
            });

            onSuccess();
            onOpenChange(false);
          } catch (error) {
            console.error('Error processing payment:', error);
            toast({
              title: "Error",
              description: "Failed to process payment",
              variant: "destructive",
            });
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate payment",
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Accessories to Booking</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accessories.map((accessory) => (
                <div
                  key={accessory.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  {accessory.image_url && (
                    <img
                      src={accessory.image_url}
                      alt={accessory.name}
                      className="w-full h-32 object-contain rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{accessory.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      ₹{accessory.price_per_day}/day
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Available: {accessory.available_quantity}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Quantity</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(accessory.id, -1)}
                        disabled={getQuantity(accessory.id) === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {getQuantity(accessory.id)}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(accessory.id, 1)}
                        disabled={getQuantity(accessory.id) >= accessory.available_quantity}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {getQuantity(accessory.id) > 0 && (
                    <div className="text-sm bg-muted p-2 rounded">
                      <p className="font-medium">
                        Total: ₹{(accessory.price_per_day * getQuantity(accessory.id) * days).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getQuantity(accessory.id)} × {days} days
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {selectedAccessories.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Accessories Cost</span>
                  <span className="font-medium">₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (18%)</span>
                  <span className="font-medium">₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total Amount</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={processing || selectedAccessories.length === 0}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Proceed to Payment"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
