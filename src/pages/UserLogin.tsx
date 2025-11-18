import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Loader2 } from "lucide-react";

export default function UserLogin() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Preserve partner parameter from URL only when user lands on login page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const partnerId = params.get('partner');
    if (partnerId) {
      localStorage.setItem('pendingPartner', partnerId);
    } else {
      // Clear any old partner if no partner in current URL
      localStorage.removeItem('pendingPartner');
    }
  }, []);

  const sendOTP = async () => {
    if (phoneNumber.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-verification', {
        body: { phoneNumber }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send OTP');

      setOtpSent(true);
      
      toast({
        title: "OTP Sent",
        description: "A 6-digit code has been sent to your phone",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Verify OTP via Twilio
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phoneNumber, code: otp }
      });

      if (error) throw error;
      if (!data?.success) {
        const isExpiredOrUsed = data?.status === 404;
        toast({
          title: isExpiredOrUsed ? "OTP Expired" : "Invalid OTP",
          description: isExpiredOrUsed
            ? "This code has expired or was already used. Please request a new OTP. Codes are valid for 5 minutes."
            : "The code you entered is incorrect. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        setOtpSent(false);
        return;
      }

      // OTP verified and session created by backend!
      if (!data.session || !data.user) {
        throw new Error("Failed to create session");
      }

      // Set the session in Supabase client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        console.error('Error setting session:', sessionError);
        throw sessionError;
      }

      toast({
        title: "Success",
        description: "You have been successfully logged in",
      });

      // Check if user has any bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', data.user.id)
        .limit(1);

      // Check if there's a pending partner
      const pendingPartner = localStorage.getItem('pendingPartner');
      const partnerParam = pendingPartner ? `?partner=${pendingPartner}` : '';
      
      // Clear pending partner after using it
      if (pendingPartner) {
        localStorage.removeItem('pendingPartner');
      }

      if (bookingsData && bookingsData.length > 0) {
        navigate(`/bookings${partnerParam}`);
      } else {
        navigate(`/book${partnerParam}`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-20">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Login with Phone</CardTitle>
            <CardDescription>
              Enter your phone number to receive a verification code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                disabled={otpSent}
                maxLength={10}
              />
            </div>

            {!otpSent ? (
              <Button 
                onClick={sendOTP} 
                disabled={loading || phoneNumber.length !== 10}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    OTP valid for 10 minutes
                  </p>
                </div>
                
                <Button onClick={verifyOTP} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Login"
                  )}
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                  }}
                  className="w-full"
                >
                  Change Phone Number
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
