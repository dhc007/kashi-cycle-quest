import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Bike, Pencil, Calendar, Clock, MapPin, Phone, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BookingSummary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [processingBooking, setProcessingBooking] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [discount, setDiscount] = useState(0);

  // Get booking data from sessionStorage
  const getBookingData = () => {
    const stored = sessionStorage.getItem('bookingData');
    if (!stored) {
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
      toast({
        title: "Error",
        description: "Invalid booking data. Please start over.",
        variant: "destructive",
      });
      navigate("/book");
      return null;
    }
  };

  const [bookingData, setBookingData] = useState<any>(getBookingData());

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
    pickupLocation,
    partnerData,
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
    return sum + ((acc.quantity || 0) * (acc.securityDeposit || 0));
  }, 0);
  
  const subtotal = basePrice + accessoriesTotal;
  const discountedSubtotal = subtotal - discount; // Apply discount first
  const gst = Math.round(discountedSubtotal * 0.18); // GST on discounted amount
  const totalBeforeDeposit = discountedSubtotal + gst;
  const totalDeposit = securityDeposit + accessoriesDeposit;
  const totalAmount = totalBeforeDeposit + totalDeposit;

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

      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
        toast({
          title: "Expired Coupon",
          description: "This coupon has expired",
          variant: "destructive",
        });
        setCouponLoading(false);
        return;
      }

      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        toast({
          title: "Minimum Order Not Met",
          description: `This coupon requires a minimum order of ₹${coupon.min_order_amount}`,
          variant: "destructive",
        });
        setCouponLoading(false);
        return;
      }

      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        toast({
          title: "Coupon Limit Reached",
          description: "This coupon has reached its usage limit",
          variant: "destructive",
        });
        setCouponLoading(false);
        return;
      }

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

  const handleEditBooking = () => {
    // Navigate back to book page with data preserved in sessionStorage
    // The Book page will read from sessionStorage and pre-fill all fields
    navigate("/book", { state: { editMode: true } });
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    setProcessingBooking(true);

    try {
      // Create booking in database (payment_status will be 'pending')
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
          payment_status: 'pending', // Payment will be collected at pickup
          accessories: accessories.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            days: acc.days,
            pricePerDay: acc.pricePerDay,
            quantity: acc.quantity || 1,
            securityDeposit: acc.securityDeposit || 0,
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

      // Send WhatsApp booking confirmation (fire and forget - don't block on failure)
      try {
        // Build payment summary string for WhatsApp template
        const paymentLines = [`Cycle × ${selectedDuration} - ₹${basePrice}`];
        if (accessories && accessories.length > 0) {
          accessories.forEach((acc: any) => {
            const accTotal = (acc.pricePerDay || 0) * (acc.days || 0) * (acc.quantity || 1);
            paymentLines.push(`${acc.name} × ${acc.days} day${acc.days > 1 ? 's' : ''} - ₹${accTotal}`);
          });
        }
        paymentLines.push(`GST (18%) - ₹${gst}`);
        paymentLines.push(`Subtotal - ₹${totalBeforeDeposit}`);
        
        await supabase.functions.invoke('send-whatsapp-confirmation', {
          body: {
            phoneNumber: phoneNumber,
            bookingId: booking.booking_id,
            cycleName: cycleName,
            pickupLocation: pickupLocation?.name || 'Bolt91 Pickup Point',
            pickupTime: `${format(new Date(selectedDate), 'dd MMM')}, ${selectedTime}`,
            returnTime: `${format(new Date(returnDate), 'dd MMM')}, ${returnTime || selectedTime}`,
            paymentSummary: paymentLines.join('\\n'),
            securityDeposit: String(totalDeposit),
            totalAmount: String(totalAmount)
          }
        });
      } catch (notificationError) {
        // Don't fail the booking if WhatsApp notification fails
        console.error('WhatsApp notification failed (non-critical)');
      }

      // Clear booking data from session storage
      sessionStorage.removeItem('bookingData');

      // Navigate to confirmation page
      navigate("/confirmation", {
        state: {
          bookingId: booking.booking_id,
          selectedDate,
          selectedTime,
          selectedDuration,
          phoneNumber,
          email,
          totalAmount,
          totalPayableAtPickup: totalAmount, // Full amount to be paid at pickup
          securityDeposit: totalDeposit,
          basePrice,
          accessoriesTotal,
          gst,
          accessories,
          pickupLocation,
          partnerData,
          appliedCoupon,
          discount,
        }
      });

    } catch (error: any) {
      setLoading(false);
      setProcessingBooking(false);
      toast({
        title: "Booking Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Processing Overlay */}
      {processingBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center text-white space-y-4 px-4">
            <div className="animate-spin">
              <Bike className="w-12 h-12 md:w-16 md:h-16 mx-auto" />
            </div>
            <p className="text-lg md:text-xl font-semibold">Confirming Your Booking...</p>
            <p className="text-xs md:text-sm text-muted-foreground">Please wait</p>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">Booking Summary</h1>
            <Button variant="outline" size="sm" onClick={handleEditBooking}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Booking
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Rental Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* Cycle Info */}
                {cycleName && cycleModel && (
                  <div className="flex items-start gap-3">
                    <Bike className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Cycle</p>
                      <p className="text-muted-foreground">{cycleName}</p>
                      <p className="text-xs text-muted-foreground">{cycleModel}</p>
                    </div>
                  </div>
                )}

                {/* Pickup Date/Time */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Pickup</p>
                    <p className="text-muted-foreground">
                      {selectedDate && format(new Date(selectedDate), "PPP")}
                    </p>
                    <p className="text-muted-foreground">{selectedTime}</p>
                  </div>
                </div>

                {/* Return Date/Time */}
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Return</p>
                    <p className="text-muted-foreground">
                      {returnDate && format(new Date(returnDate), "PPP")}
                    </p>
                    <p className="text-muted-foreground">{returnTime || selectedTime}</p>
                    <p className="text-xs text-muted-foreground">Duration: {selectedDuration}</p>
                  </div>
                </div>

                {/* Pickup Location */}
                {pickupLocation && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Pickup Location</p>
                      <p className="text-muted-foreground font-medium">{pickupLocation.name}</p>
                      <p className="text-xs text-muted-foreground">{pickupLocation.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {pickupLocation.city}, {pickupLocation.state} - {pickupLocation.pincode}
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Contact</p>
                    <p className="text-muted-foreground">{firstName} {lastName}</p>
                    <p className="text-xs text-muted-foreground">{phoneNumber}</p>
                    {email && <p className="text-xs text-muted-foreground">{email}</p>}
                  </div>
                </div>

                {/* Accessories */}
                {accessories.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="font-medium mb-2">Accessories</p>
                    {accessories.map((acc: any) => (
                      <p key={acc.id} className="text-muted-foreground text-xs">
                        {acc.name} × {acc.quantity || 1} ({acc.days} day{acc.days > 1 ? 's' : ''})
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <div className="space-y-2 md:space-y-3 text-sm">
                  {/* Cycle Rental */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cycle Rental ({selectedDuration})</span>
                    <span className="font-semibold">₹{basePrice.toFixed(2)}</span>
                  </div>
                  
                  {/* Accessories */}
                  {accessories && accessories.length > 0 && (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Accessories:</p>
                      {accessories.map((acc: any) => (
                        <div key={acc.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {acc.name} × {acc.quantity || 1} × {acc.days} day{acc.days > 1 ? 's' : ''} @ ₹{acc.pricePerDay}/day
                          </span>
                          <span>₹{((acc.pricePerDay || 0) * (acc.days || 0) * (acc.quantity || 1)).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-medium pt-1">
                        <span>Accessories Total</span>
                        <span>₹{accessoriesTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Subtotal */}
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>

                  {/* Discount - Applied before GST */}
                  {discount > 0 && appliedCoupon && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                        <span>
                          Discount ({appliedCoupon.code} - {appliedCoupon.discount_type === 'percentage' 
                            ? `${appliedCoupon.discount_value}%` 
                            : `₹${appliedCoupon.discount_value}`})
                        </span>
                        <span>-₹{discount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* GST - Calculated on discounted amount */}
                  <div className="flex justify-between text-xs">
                    <span>GST (18%){discount > 0 && <span className="text-muted-foreground ml-1">(on ₹{discountedSubtotal.toFixed(0)})</span>}</span>
                    <span>₹{gst.toFixed(2)}</span>
                  </div>

                  {/* Rental Total */}
                  <div className="border-t pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-base">Rental Amount</span>
                    <span className="font-bold text-primary text-lg">₹{totalBeforeDeposit.toFixed(2)}</span>
                  </div>
                  
                  {/* Security Deposit */}
                  <div className="flex flex-col gap-2 pt-2 border-t bg-amber-50 dark:bg-amber-950/30 -mx-4 md:-mx-6 px-4 md:px-6 py-3 rounded">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1 text-xs">
                          <span className="text-amber-600 dark:text-amber-400">🔒</span>
                          <span className="font-semibold">Cycle Security Deposit</span>
                          <span className="text-[10px] text-muted-foreground">(Refundable)</span>
                        </span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">₹{securityDeposit.toFixed(2)}</span>
                      </div>
                      {accessoriesDeposit > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1 text-xs">
                            <span className="text-amber-600 dark:text-amber-400">🔒</span>
                            <span className="font-semibold">Accessories Security Deposit</span>
                            <span className="text-[10px] text-muted-foreground">(Refundable)</span>
                          </span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">₹{accessoriesDeposit.toFixed(2)}</span>
                        </div>
                      )}
                      {accessoriesDeposit > 0 && (
                        <div className="flex justify-between items-center pt-1 border-t border-amber-200 dark:border-amber-800">
                          <span className="text-xs font-bold">Total Security Deposit</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">₹{totalDeposit.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="border-t-2 border-primary pt-3 flex flex-col gap-1">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-lg">Total Payable at Pickup</span>
                      <span className="font-bold text-primary text-xl">₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      Including Refundable Security Deposit of ₹{totalDeposit.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Coupon Code */}
                <div className="border-t pt-4 space-y-3">
                  {!appliedCoupon ? (
                    <div className="space-y-2">
                      <Label htmlFor="coupon" className="text-sm">Have a coupon code?</Label>
                      <div className="flex gap-2">
                        <Input
                          id="coupon"
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1"
                        />
                        <Button 
                          onClick={applyCoupon} 
                          disabled={couponLoading}
                          size="sm"
                        >
                          {couponLoading ? "..." : "Apply"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          {appliedCoupon.code} applied
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500">
                          You save ₹{discount}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={removeCoupon}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>

                {/* Confirm Button */}
                <Button
                  className="w-full bg-gradient-primary hover:opacity-90 text-lg py-6"
                  onClick={handleConfirmBooking}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Confirm Booking"}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Payment will be collected at the pickup location via QR code scan
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;