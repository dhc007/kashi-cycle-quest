import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { differenceInDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Accessory {
  id: string;
  name: string;
  price_per_day: number;
  image_url: string | null;
  available_quantity: number;
  security_deposit: number;
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
  days: number;
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
  const [existingAccessoryIds, setExistingAccessoryIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  // Calculate max days: from today to return date
  const today = new Date();
  const returnD = new Date(returnDate);
  const daysFromTodayToReturn = Math.max(1, differenceInDays(returnD, today));
  const maxDays = daysFromTodayToReturn;

  useEffect(() => {
    if (open) {
      loadAccessories();
      loadExistingAccessories();
      setSelectedAccessories([]);
    }
  }, [open]);

  const loadExistingAccessories = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_accessories')
        .select('accessory_id')
        .eq('booking_id', bookingId);

      if (error) throw error;
      
      const existingIds = new Set(data?.map(item => item.accessory_id) || []);
      setExistingAccessoryIds(existingIds);
    } catch (error: any) {
      console.error('Error loading existing accessories:', error);
    }
  };

  const loadAccessories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('accessories')
        .select('id, name, price_per_day, image_url, available_quantity, security_deposit')
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

  const toggleAccessory = (accessoryId: string) => {
    setSelectedAccessories(prev => {
      const existing = prev.find(a => a.id === accessoryId);
      if (existing) {
        return prev.filter(a => a.id !== accessoryId);
      } else {
        return [...prev, { id: accessoryId, days: maxDays }];
      }
    });
  };

  const updateDays = (accessoryId: string, days: number) => {
    setSelectedAccessories(prev =>
      prev.map(a => a.id === accessoryId ? { ...a, days } : a)
    );
  };

  const isSelected = (accessoryId: string) => {
    return selectedAccessories.some(a => a.id === accessoryId);
  };

  const getSelectedDays = (accessoryId: string) => {
    return selectedAccessories.find(a => a.id === accessoryId)?.days || maxDays;
  };

  const calculateTotal = () => {
    return selectedAccessories.reduce((total, selected) => {
      const accessory = accessories.find((a) => a.id === selected.id);
      if (!accessory) return total;
      return total + (accessory.price_per_day * selected.days);
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

      // Create PhonePe order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-phonepe-order',
        {
          body: {
            amount: grandTotal,
            currency: 'INR',
            receipt: `addon_${bookingId}_${Date.now()}`,
          },
        }
      );

      if (orderError) throw orderError;

      if (!orderData.redirectUrl) {
        throw new Error('Failed to get payment URL');
      }

      // Store addon data in sessionStorage for callback
      sessionStorage.setItem('addonPaymentData', JSON.stringify({
        bookingId,
        merchantTransactionId: orderData.merchantTransactionId,
        selectedAccessories: selectedAccessories.map((selected) => {
          const accessory = accessories.find((a) => a.id === selected.id)!;
          return {
            accessory_id: selected.id,
            quantity: 1,
            days: selected.days,
            price_per_day: accessory.price_per_day,
            total_cost: accessory.price_per_day * selected.days,
          };
        }),
        totalAmount,
        grandTotal,
      }));

      // Open PhonePe payment in a new window
      const paymentWindow = window.open(orderData.redirectUrl, '_blank');
      
      // Poll for payment completion
      const pollInterval = setInterval(async () => {
        try {
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
            'verify-phonepe-payment',
            {
              body: {
                merchantTransactionId: orderData.merchantTransactionId,
                booking_id: bookingId,
                is_addon: true,
              },
            }
          );

          if (verifyError) {
            console.error('Verification error:', verifyError);
            return;
          }

          if (verifyData.verified && verifyData.state === 'COMPLETED') {
            clearInterval(pollInterval);
            
            // Add accessories to booking
            const accessoriesToInsert = selectedAccessories.map((selected) => {
              const accessory = accessories.find((a) => a.id === selected.id)!;
              return {
                booking_id: bookingId,
                accessory_id: selected.id,
                quantity: 1,
                days: selected.days,
                price_per_day: accessory.price_per_day,
                total_cost: accessory.price_per_day * selected.days,
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

            await supabase
              .from('bookings')
              .update({
                accessories_cost: (bookingData.accessories_cost || 0) + totalAmount,
                total_amount: bookingData.total_amount + grandTotal,
              })
              .eq('id', bookingId);

            toast({
              title: "Success",
              description: "Accessories added successfully",
            });

            setProcessing(false);
            onSuccess();
            onOpenChange(false);
          } else if (verifyData.state === 'FAILED') {
            clearInterval(pollInterval);
            setProcessing(false);
            toast({
              title: "Payment Failed",
              description: "The payment was not successful",
              variant: "destructive",
            });
          }
        } catch (err) {
          console.error('Poll error:', err);
        }
      }, 3000);

      // Stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (processing) {
          setProcessing(false);
          toast({
            title: "Payment Timeout",
            description: "Payment verification timed out. Please check your booking.",
            variant: "destructive",
          });
        }
      }, 600000);

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
            {accessories.filter(acc => !existingAccessoryIds.has(acc.id)).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                All available accessories have been added to this booking.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accessories.filter(acc => !existingAccessoryIds.has(acc.id)).map((accessory) => {
                  const selected = isSelected(accessory.id);
                  const selectedDays = getSelectedDays(accessory.id);
                  
                  return (
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
                        {accessory.security_deposit > 0 && (
                          <p className="text-xs text-amber-600 font-medium">
                            SD: ₹{accessory.security_deposit}
                          </p>
                        )}
                      </div>

                      {selected && (
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <Select
                            value={selectedDays.toString()}
                            onValueChange={(value) => updateDays(accessory.id, parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: maxDays }, (_, i) => i + 1).map(day => (
                                <SelectItem key={day} value={day.toString()}>
                                  {day} {day === 1 ? 'day' : 'days'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="text-sm bg-muted p-2 rounded">
                            <p className="font-medium">
                              Total: ₹{(accessory.price_per_day * selectedDays).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        variant={selected ? "secondary" : "default"}
                        onClick={() => toggleAccessory(accessory.id)}
                      >
                        {selected ? "Remove" : "Add"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

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