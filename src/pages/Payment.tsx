import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [insurance, setInsurance] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to continue with booking",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      setUser(user);
    };

    checkAuth();

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [navigate, toast]);

  const bookingData = location.state || {};
  const {
    selectedDate,
    selectedTime,
    selectedDuration,
    returnDate,
    accessories = [],
    phoneNumber,
    email,
    fullName,
    emergencyName,
    emergencyPhone,
    cycleId,
    partnerId,
    basePrice = 0,
    accessoriesTotal = 0,
    securityDeposit = 0,
    livePhoto,
    idProof,
  } = bookingData;

  const insuranceCost = 21;
  const subtotal = basePrice + accessoriesTotal;
  const gst = Math.round(subtotal * 0.18); // 18% GST
  const totalAmount = subtotal + (insurance ? insuranceCost : 0) + gst + securityDeposit;

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Upload files if needed
      let photoUrl = null;
      let idProofUrl = null;

      if (livePhoto) {
        const photoExt = livePhoto.name.split('.').pop();
        const photoPath = `${user.id}/live_photo_${Date.now()}.${photoExt}`;
        const { error: photoError } = await supabase.storage
          .from('documents')
          .upload(photoPath, livePhoto);
        
        if (!photoError) {
          const { data } = supabase.storage.from('documents').getPublicUrl(photoPath);
          photoUrl = data.publicUrl;
        }
      }

      if (idProof) {
        const idExt = idProof.name.split('.').pop();
        const idPath = `${user.id}/id_proof_${Date.now()}.${idExt}`;
        const { error: idError } = await supabase.storage
          .from('documents')
          .upload(idPath, idProof);
        
        if (!idError) {
          const { data } = supabase.storage.from('documents').getPublicUrl(idPath);
          idProofUrl = data.publicUrl;
        }
      }

      // Create booking in database
      const { data, error: functionError } = await supabase.functions.invoke('create-booking', {
        body: {
          cycle_id: cycleId,
          partner_id: partnerId,
          pickup_date: format(new Date(selectedDate), 'yyyy-MM-dd'),
          pickup_time: selectedTime,
          return_date: returnDate,
          duration_type: selectedDuration,
          cycle_rental_cost: basePrice,
          accessories_cost: accessoriesTotal,
          insurance_cost: insurance ? insuranceCost : 0,
          gst: gst,
          security_deposit: securityDeposit,
          total_amount: totalAmount,
          has_insurance: insurance,
          accessories: accessories.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            days: acc.days,
            pricePerDay: acc.pricePerDay,
          })),
          profile: {
            full_name: fullName,
            phone_number: phoneNumber,
            email: email,
            emergency_contact_name: emergencyName,
            emergency_contact_phone: emergencyPhone,
            photo_url: photoUrl,
            id_proof_url: idProofUrl,
          },
        },
      });

      if (functionError) throw functionError;

      const booking = data.booking;

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: totalAmount,
          currency: 'INR',
          receipt: booking.booking_id,
        },
      });

      if (orderError) throw orderError;

      const options = {
        key: orderData.key_id,
        amount: totalAmount * 100,
        currency: 'INR',
        name: 'Bolt91',
        description: 'Electric Bicycle Rental',
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            // Verify payment
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_id: booking.booking_id,
              },
            });

            if (verifyError) throw verifyError;

            toast({
              title: "Payment Successful",
              description: "Your booking has been confirmed!",
            });

            navigate("/confirmation", {
              state: {
                ...bookingData,
                insurance,
                totalAmount,
                paymentId: response.razorpay_payment_id,
                bookingId: booking.booking_id,
              },
            });
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast({
              title: "Payment Verification Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: fullName,
          email: email || '',
          contact: phoneNumber || '',
        },
        theme: {
          color: '#F5A623',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setLoading(false);

    } catch (error: any) {
      console.error('Payment error:', error);
      setLoading(false);
      toast({
        title: "Payment Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Payment</h1>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium">Pickup</p>
                    <p className="text-muted-foreground">
                      {selectedDate && format(new Date(selectedDate), "PPP")} at {selectedTime}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-muted-foreground">{selectedDuration}</p>
                  </div>
                  {accessories.length > 0 && (
                    <div>
                      <p className="font-medium">Accessories</p>
                      {accessories.map((acc: any) => (
                        <p key={acc.id} className="text-muted-foreground text-xs">
                          {acc.name} ({acc.days} day{acc.days > 1 ? 's' : ''})
                        </p>
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">Contact</p>
                    <p className="text-muted-foreground">{phoneNumber}</p>
                    {email && <p className="text-muted-foreground text-xs">{email}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Cycle Rental ({selectedDuration})</span>
                    <span className="font-semibold">₹{basePrice}</span>
                  </div>
                  
                  {accessoriesTotal > 0 && (
                    <div className="flex justify-between">
                      <span>Accessories</span>
                      <span className="font-semibold">₹{accessoriesTotal}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>Security Deposit (Refundable)</span>
                    <span className="font-semibold">₹{securityDeposit}</span>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-start gap-3 mb-3">
                      <Checkbox
                        id="insurance"
                        checked={insurance}
                        onCheckedChange={(checked) => setInsurance(checked as boolean)}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="insurance"
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          Add Damage Insurance (₹{insuranceCost})
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Covers accidental damage during rental period
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span>GST (18%)</span>
                    <span>₹{gst}</span>
                  </div>

                  <div className="border-t pt-3 flex justify-between">
                    <span className="font-bold text-lg">Total Amount</span>
                    <span className="font-bold text-primary text-xl">₹{totalAmount}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full bg-gradient-primary hover:opacity-90"
                  size="lg"
                >
                  {loading ? "Processing..." : "Proceed to Payment"}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span>🔒 Secure payment powered by Razorpay</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
