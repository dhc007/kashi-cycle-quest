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
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Accessory {
  id: string;
  name: string;
  price_per_day: number;
  security_deposit: number;
  available_quantity: number;
}

interface BookingAccessory {
  accessory_id: string;
  quantity: number;
  days: number;
  price_per_day: number;
  total_cost: number;
  accessories: {
    name: string;
  };
}

interface EditBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  currentAccessories: BookingAccessory[];
  onSuccess: () => void;
}

export const EditBookingDialog = ({ 
  open, 
  onOpenChange, 
  bookingId, 
  pickupDate, 
  returnDate,
  pickupTime,
  currentAccessories,
  onSuccess 
}: EditBookingDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [allAccessories, setAllAccessories] = useState<Accessory[]>([]);
  const [selectedAccessories, setSelectedAccessories] = useState<Map<string, number>>(new Map());
  const [priceDifference, setPriceDifference] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadAccessories();
      initializeSelectedAccessories();
    }
  }, [open]);

  const loadAccessories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("accessories")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setAllAccessories(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load accessories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeSelectedAccessories = () => {
    const map = new Map<string, number>();
    currentAccessories.forEach((acc) => {
      map.set(acc.accessory_id, acc.quantity);
    });
    setSelectedAccessories(map);
  };

  const updateQuantity = (accessoryId: string, change: number) => {
    const accessory = allAccessories.find((a) => a.id === accessoryId);
    if (!accessory) return;
    
    const current = selectedAccessories.get(accessoryId) || 0;
    const newValue = Math.max(0, current + change);
    
    // Prevent adding if no stock available
    if (change > 0 && accessory.available_quantity <= 0) {
      toast({
        title: "Not Available",
        description: `${accessory.name} is currently not available`,
        variant: "destructive",
      });
      return;
    }
    
    // Prevent exceeding available quantity
    if (newValue > accessory.available_quantity) {
      toast({
        title: "Quantity Exceeded",
        description: `Only ${accessory.available_quantity} ${accessory.name}(s) available`,
        variant: "destructive",
      });
      return;
    }
    
    const newMap = new Map(selectedAccessories);
    if (newValue === 0) {
      newMap.delete(accessoryId);
    } else {
      newMap.set(accessoryId, newValue);
    }
    setSelectedAccessories(newMap);
    calculatePriceDifference(newMap);
  };

  const calculatePriceDifference = (newAccessories: Map<string, number>) => {
    const days = Math.ceil(
      (new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate old total
    const oldTotal = currentAccessories.reduce((sum, acc) => sum + acc.total_cost, 0);

    // Calculate new total
    let newTotal = 0;
    newAccessories.forEach((quantity, accessoryId) => {
      const accessory = allAccessories.find((a) => a.id === accessoryId);
      if (accessory) {
        newTotal += quantity * accessory.price_per_day * days;
      }
    });

    const difference = newTotal - oldTotal;
    const gst = difference * 0.18;
    setPriceDifference(difference + gst);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Prepare accessories data
      const days = Math.ceil(
        (new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      const accessoriesData = Array.from(selectedAccessories.entries()).map(([id, quantity]) => {
        const accessory = allAccessories.find((a) => a.id === id);
        return {
          accessory_id: id,
          quantity,
          days,
          price_per_day: accessory?.price_per_day || 0,
        };
      });

      const { error } = await supabase.functions.invoke("update-booking-accessories", {
        body: {
          bookingId,
          accessories: accessoriesData,
          priceDifference,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: priceDifference > 0 
          ? "Booking updated. Please complete the payment."
          : "Booking accessories updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating booking:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update booking",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = () => {
    const now = new Date();
    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
    const twoHoursBefore = new Date(pickupDateTime.getTime() - 2 * 60 * 60 * 1000);
    return now < twoHoursBefore;
  };

  if (!canEdit()) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Edit Booking</DialogTitle>
            <DialogDescription>
              Bookings can only be edited until 2 hours before the pickup time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Booking Accessories</DialogTitle>
          <DialogDescription>
            Add or remove accessories from your booking. Changes can be made until 2 hours before pickup.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Loading accessories...</div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm font-medium mb-1">Booking Period</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(pickupDate), "PPP")} - {format(new Date(returnDate), "PPP")}
              </p>
            </div>

            <div className="space-y-3">
              {allAccessories.map((accessory) => {
                const currentQty = selectedAccessories.get(accessory.id) || 0;
                const maxQty = accessory.available_quantity;
                const isUnavailable = maxQty <= 0;

                return (
                  <div key={accessory.id} className={`border rounded-lg p-4 ${isUnavailable ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{accessory.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ₹{accessory.price_per_day}/day • {isUnavailable ? (
                            <span className="text-destructive font-medium">Not Available</span>
                          ) : (
                            `Available: ${maxQty}`
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(accessory.id, -1)}
                          disabled={currentQty === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Badge variant="secondary" className="min-w-[40px] justify-center">
                          {currentQty}
                        </Badge>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(accessory.id, 1)}
                          disabled={isUnavailable || currentQty >= maxQty}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {priceDifference !== 0 && (
              <div className="bg-muted/50 p-4 rounded-md space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">Price Adjustment</p>
                    <p className="text-sm text-muted-foreground">
                      {priceDifference > 0 
                        ? `You will need to pay an additional ₹${priceDifference.toFixed(2)} (including GST)`
                        : `You will receive a refund of ₹${Math.abs(priceDifference).toFixed(2)}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loading}>
            {submitting ? "Updating..." : "Update Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
