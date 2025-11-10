import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

import { Bike } from "lucide-react";

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
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Get booking data from sessionStorage
  const getBookingData = () => {
    const stored = sessionStorage.getItem('bookingData');
    console.log('SessionStorage bookingData:', stored);
    if (!stored) {
      console.error('No booking data found in sessionStorage');
      toast({
        title: "Error",
        description: "Booking data not found. Please start over.",
        variant: "destructive",
      });
      navigate("/book");
      return null;
    }
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse booking data:', error);
      toast({
        title: "Error",
        description: "Invalid booking data. Please start over.",
        variant: "destructive",
      });
      navigate("/book");
      return null;
    }
  };

  const bookingData = getBookingData();

  // If no booking data, don't render anything (will redirect)
  if (!bookingData) {
    return null;
  }
  const {
    selectedDate,
    selectedTime,
    selectedDuration,
    returnDate,
    returnTime,
    cycleName,
    cycleModel,
    accessories = [],
    phoneNumber,
    email,
    firstName,
    lastName,
    emergencyName,
    emergencyPhone,
    cycleId,
    partnerId,
    pickupLocationId,
    basePrice = 0,
    accessoriesTotal = 0,
    securityDeposit = 0,
    livePhotoUrl,
    idProofUrl,
  } = bookingData;

  const insuranceCost = 21;
  const subtotal = basePrice + accessoriesTotal;
  const gst = Math.round(subtotal * 0.18); // 18% GST
  const totalAmount = subtotal + (insurance ? insuranceCost : 0) + gst + securityDeposit;

  const handlePayment = async () => {
    setLoading(true);

    try {
      // Create booking in database
      const { data, error: functionError } = await supabase.functions.invoke('create-booking', {
        body: {
          cycle_id: cycleId,
          partner_id: partnerId,
          pickup_location_id: pickupLocationId,
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
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            email: email,
            emergency_contact_name: emergencyName,
            emergency_contact_phone: emergencyPhone,
            photo_url: livePhotoUrl,
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
          name: `${firstName} ${lastName}`,
          email: email || '',
          contact: phoneNumber || '',
        },
        theme: {
          color: '#F5A623',
        },
      };

      const razorpay = new window.Razorpay(options);
      
      // Set payment processing state when Razorpay is opened
      razorpay.on('payment.submit', () => {
        setProcessingPayment(true);
      });
      
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
      
      {/* Payment Processing Overlay */}
      {processingPayment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center text-white space-y-4 px-4">
            <div className="animate-spin">
              <Bike className="w-12 h-12 md:w-16 md:h-16 mx-auto" />
            </div>
            <p className="text-lg md:text-xl font-semibold">Payment Processing...</p>
            <p className="text-xs md:text-sm text-muted-foreground">Please wait</p>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">Payment</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <div className="space-y-2 text-xs md:text-sm">
                  {cycleName && cycleModel && (
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Bike className="w-4 h-4 text-primary" />
                        Cycle
                      </p>
                      <p className="text-muted-foreground ml-6">{cycleName}</p>
                      <p className="text-xs text-muted-foreground ml-6">{cycleModel}</p>
                    </div>
                  )}
                  <div>
                    <p className="font-medium">Pickup</p>
                    <p className="text-muted-foreground">
                      {selectedDate && format(new Date(selectedDate), "PPP")} at {selectedTime}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Return</p>
                    <p className="text-muted-foreground">
                      {returnDate && format(new Date(returnDate), "PPP")} at {returnTime || selectedTime}
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
                <CardTitle className="text-lg md:text-xl">Payment Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
                  {/* Cycle Rental Breakdown */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {cycleName} × {selectedDuration === "One Day" ? "1 day" : selectedDuration === "One Week" ? "7 days" : "30 days"}
                      </span>
                      <span className="font-semibold">₹{basePrice}</span>
                    </div>
                  </div>
                  
                  {/* Accessories Breakdown */}
                  {accessories.length > 0 && (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Accessories:</p>
                      {accessories.map((acc: any) => (
                        <div key={acc.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {acc.name} × {acc.days} {acc.days > 1 ? 'days' : 'day'}
                          </span>
                          <span>₹{acc.pricePerDay * acc.days}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Security Deposit */}
                  <div className="flex justify-between items-center pt-2 border-t bg-green-50 dark:bg-green-950 -mx-4 px-4 py-2 rounded">
                    <span className="flex items-center gap-1">
                      <span className="text-green-600 dark:text-green-400">🔒</span>
                      <span className="font-medium">Security Deposit</span>
                      <span className="text-xs text-muted-foreground">(Fully Refundable)</span>
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">₹{securityDeposit}</span>
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
