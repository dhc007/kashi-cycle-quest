import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Bike, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed' | 'pending'>('verifying');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      // Support both old (merchantOrderId) and new (merchantTransactionId) query params
      const merchantTransactionId = searchParams.get('merchantTransactionId') || searchParams.get('merchantOrderId');
      
      if (!merchantTransactionId) {
        setStatus('failed');
        setError('Missing payment reference');
        return;
      }

      // Get booking data from sessionStorage
      const bookingDataStr = sessionStorage.getItem('bookingData');
      const pendingBookingId = sessionStorage.getItem('pendingBookingId');
      
      if (!pendingBookingId) {
        setStatus('failed');
        setError('Booking reference not found. Please try again.');
        return;
      }

      // Verify payment with PhonePe
      const { data, error: verifyError } = await supabase.functions.invoke('verify-phonepe-payment', {
        body: {
          merchantTransactionId,
          booking_id: pendingBookingId,
          is_addon: false,
        },
      });

      if (verifyError) {
        throw verifyError;
      }

      if (data.success && data.verified) {
        setStatus('success');
        
        toast({
          title: "Payment Successful",
          description: "Your booking has been confirmed!",
        });

        // Navigate to confirmation page with booking data
        const bookingData = bookingDataStr ? JSON.parse(bookingDataStr) : {};
        
        setTimeout(() => {
          navigate("/confirmation", {
            state: {
              ...bookingData,
              paymentId: data.transactionId,
              bookingId: pendingBookingId,
            },
          });
        }, 2000);

      } else if (data.state === 'PENDING') {
        setStatus('pending');
      } else {
        setStatus('failed');
        setError(data.message || 'Payment verification failed');
      }

    } catch (err: any) {
      console.error('Payment verification error:', err);
      setStatus('failed');
      setError(err.message || 'Failed to verify payment');
    }
  };

  const handleRetry = () => {
    navigate('/payment');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              {status === 'verifying' && (
                <>
                  <div className="flex justify-center">
                    <Loader2 className="w-16 h-16 text-primary animate-spin" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Verifying Payment...</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Please wait while we confirm your payment
                    </p>
                  </div>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="flex justify-center">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-600">Payment Successful!</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your booking has been confirmed. Redirecting...
                    </p>
                  </div>
                </>
              )}

              {status === 'failed' && (
                <>
                  <div className="flex justify-center">
                    <XCircle className="w-16 h-16 text-red-500" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-red-600">Payment Failed</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {error || 'Something went wrong with your payment'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={handleRetry} className="w-full">
                      Try Again
                    </Button>
                    <Button variant="outline" onClick={handleGoHome} className="w-full">
                      Go to Home
                    </Button>
                  </div>
                </>
              )}

              {status === 'pending' && (
                <>
                  <div className="flex justify-center">
                    <Bike className="w-16 h-16 text-amber-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-amber-600">Payment Pending</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your payment is being processed. This may take a few moments.
                    </p>
                  </div>
                  <Button onClick={verifyPayment} variant="outline" className="w-full">
                    Check Status Again
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback;