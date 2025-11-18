import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [discount, setDiscount] = useState(0);

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
    termsAcceptedAt,
    termsVersion = "v1.0",
  } = bookingData;

  // Calculate accessories security deposit
  const accessoriesDeposit = accessories.reduce((sum: number, acc: any) => {
    return sum + (acc.securityDeposit || 0);
  }, 0);
  
  const subtotal = basePrice + accessoriesTotal;
  const gst = Math.round(subtotal * 0.18); // 18% GST
  const totalBeforeDeposit = subtotal + gst - discount;
  const onlinePaymentAmount = totalBeforeDeposit; // Amount to be paid online (excludes deposit)
  const totalDeposit = securityDeposit + accessoriesDeposit; // Total deposit including cycle and accessories
  const totalAmount = totalBeforeDeposit + totalDeposit; // Total including deposit for record-keeping

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }

    setCouponLoading(true);
    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        toast({
          title: "Invalid Coupon",
          description: "The coupon code you entered is not valid",
          variant: "destructive",
        });
        setCouponLoading(false);
        return;
      }

      // Check if coupon is expired
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        toast({
          title: "Expired Coupon",
          description: "This coupon has expired",
          variant: "destructive",
        });
        setCouponLoading(false);
        return;
      }

      // Check min order amount
      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        toast({
          title: "Minimum Order Not Met",
          description: `This coupon requires a minimum order of ₹${coupon.min_order_amount}`,
          variant: "destructive",
        });
        setCouponLoading(false);
        return;
      }

      // Check max uses
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        toast({
          title: "Coupon Limit Reached",
          description: "This coupon has reached its usage limit",
          variant: "destructive",
        });
        setCouponLoading(false);
        return;
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.round(subtotal * (coupon.discount_value / 100));
      } else {
        discountAmount = coupon.discount_value;
      }

      setDiscount(discountAmount);
      setAppliedCoupon(coupon);
      toast({
        title: "Coupon Applied!",
        description: `You saved ₹${discountAmount}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode("");
    toast({
      title: "Coupon Removed",
      description: "The coupon has been removed from your order",
    });
  };

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
          return_date: format(new Date(returnDate), 'yyyy-MM-dd'),
          return_time: returnTime || selectedTime,
          duration_type: selectedDuration,
          cycle_rental_cost: basePrice,
          accessories_cost: accessoriesTotal,
          insurance_cost: 0,
          gst: gst,
          security_deposit: securityDeposit,
          total_amount: totalAmount,
          has_insurance: false,
          coupon_id: appliedCoupon?.id || null,
          coupon_code: appliedCoupon?.code || null,
          discount_amount: discount,
          terms_accepted_at: termsAcceptedAt,
          terms_version: termsVersion,
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

      // Create Razorpay order (only for rental charges, excluding deposit)
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: onlinePaymentAmount,
          currency: 'INR',
          receipt: booking.booking_id,
        },
      });

      if (orderError) throw orderError;

      const options = {
        key: orderData.key_id,
        amount: onlinePaymentAmount * 100,
        currency: 'INR',
        name: 'Blue Bolt Electric Pvt Ltd',
        description: 'Electric Bicycle Rental (Deposit payable at pickup)',
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
                totalAmount,
                onlinePaymentAmount,
                securityDeposit,
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
                        Cycle Rental ({selectedDuration})
                      </span>
                      <span className="font-semibold">₹{basePrice.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Accessories Breakdown */}
                  {accessories && accessories.length > 0 && (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Accessories:</p>
                      {accessories.map((acc: any) => (
                        <div key={acc.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {acc.name} × {acc.days} {acc.days > 1 ? 'days' : 'day'} @ ₹{acc.pricePerDay}/day
                          </span>
                          <span>₹{(acc.pricePerDay * acc.days).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-medium pt-1">
                        <span>Accessories Total</span>
                        <span>₹{accessoriesTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Subtotal */}
                  <div className="flex justify-between text-xs pt-2 border-t">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-xs">
                    <span>GST (18%)</span>
                    <span>₹{gst.toFixed(2)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Online Payment Amount */}
                  <div className="border-t pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-base md:text-lg">Pay Online Now</span>
                    <span className="font-bold text-primary text-lg md:text-xl">₹{onlinePaymentAmount.toFixed(2)}</span>
                  </div>
                  
                  {/* Security Deposit - Payable at Pickup */}
                  <div className="flex flex-col gap-2 pt-2 border-t bg-amber-50 dark:bg-amber-950/30 -mx-4 md:-mx-6 px-4 md:px-6 py-3 rounded">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1 text-xs">
                          <span className="text-amber-600 dark:text-amber-400">🔒</span>
                          <span className="font-semibold">Cycle Deposit</span>
                          <span className="text-[10px] text-muted-foreground">(Refundable)</span>
                        </span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">₹{securityDeposit.toFixed(2)}</span>
                      </div>
                      {accessoriesDeposit > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1 text-xs">
                            <span className="text-amber-600 dark:text-amber-400">🔒</span>
                            <span className="font-semibold">Accessories Deposit</span>
                            <span className="text-[10px] text-muted-foreground">(Refundable)</span>
                          </span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">₹{accessoriesDeposit.toFixed(2)}</span>
                        </div>
                      )}
                      {accessoriesDeposit > 0 && (
                        <div className="flex justify-between items-center pt-1 border-t border-amber-200 dark:border-amber-800">
                          <span className="text-xs font-bold">Total Deposit</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">₹{totalDeposit.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] md:text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-1.5 rounded">
                      💳 <span className="font-medium">Payable during pickup</span> - This refundable deposit will be collected at the time of cycle pickup and refunded after safe return.
                    </div>
                  </div>
                  
                  {/* Total Amount Summary */}
                  <div className="text-[10px] md:text-xs text-center text-muted-foreground bg-muted/50 -mx-4 md:-mx-6 px-4 md:px-6 py-2 rounded">
                    Total Booking Value: ₹{totalAmount.toFixed(2)} (₹{onlinePaymentAmount.toFixed(2)} online + ₹{totalDeposit.toFixed(2)} at pickup)
                  </div>
                </div>

                {/* Coupon Code Input */}
                <div className="border-t pt-4 space-y-3">
                  <Label htmlFor="couponCode">Have a Coupon Code?</Label>
                  <div className="flex gap-2">
                    <Input
                      id="couponCode"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      disabled={appliedCoupon !== null}
                      className="uppercase"
                    />
                    {appliedCoupon ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={removeCoupon}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                      >
                        {couponLoading ? "Checking..." : "Apply"}
                      </Button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Coupon applied: {appliedCoupon.description}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full bg-gradient-primary hover:opacity-90"
                  size="lg"
                >
                  {loading ? "Processing..." : `Pay ₹${onlinePaymentAmount.toFixed(2)} Now`}
                </Button>

                <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                  <span>🔒 Secure payment powered by Razorpay</span>
                  <span className="text-[10px]">Deposit of ₹{securityDeposit.toFixed(2)} payable at pickup</span>
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
