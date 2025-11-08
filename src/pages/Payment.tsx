import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [insurance, setInsurance] = useState(false);
  const [loading, setLoading] = useState(false);

  const bookingData = location.state || {};
  const {
    selectedDate,
    selectedTime,
    selectedDuration,
    accessories = [],
    phoneNumber,
    email,
    basePrice = 0,
    accessoriesTotal = 0,
    securityDeposit = 0,
  } = bookingData;

  const insuranceCost = 21;
  const subtotal = basePrice + accessoriesTotal;
  const gst = Math.round(subtotal * 0.18); // 18% GST
  const totalAmount = subtotal + (insurance ? insuranceCost : 0) + gst + securityDeposit;

  const handlePayment = async () => {
    setLoading(true);

    // Mock Razorpay integration
    // In production, you would initialize Razorpay with your keys
    const options = {
      key: "rzp_test_RbFwVC6snkmj8S",
      amount: totalAmount * 100, // Amount in paise
      currency: "INR",
      name: "Bolt91",
      description: "Electric Bicycle Rental",
      handler: function (response: any) {
        toast({
          title: "Payment Successful",
          description: "Your booking has been confirmed!",
        });
        navigate("/confirmation", {
          state: {
            ...bookingData,
            insurance,
            totalAmount,
            paymentId: response.razorpay_payment_id || "MOCK123456",
            bookingId: `BLT${Date.now().toString().slice(-8)}`,
          },
        });
      },
      prefill: {
        email: email || "",
        contact: phoneNumber || "",
      },
      theme: {
        color: "#F5A623",
      },
    };

    // Simulate payment success after 2 seconds
    setTimeout(() => {
      setLoading(false);
      navigate("/confirmation", {
        state: {
          ...bookingData,
          insurance,
          totalAmount,
          paymentId: "MOCK123456",
          bookingId: `BLT${Date.now().toString().slice(-8)}`,
        },
      });
    }, 2000);
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
