import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { OTPDialog } from "@/components/OTPDialog";
import { Loader2 } from "lucide-react";

export default function UserLogin() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateMockOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

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
      const mockOTP = generateMockOTP();
      setGeneratedOTP(mockOTP);
      
      // Store OTP in database with expiry
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      
      const { error } = await supabase
        .from('phone_otps')
        .insert({
          phone_number: phoneNumber,
          otp_code: mockOTP,
          expires_at: expiresAt.toISOString(),
          verified: false,
        });

      if (error) throw error;

      setOtpSent(true);
      setShowOTPDialog(true);
      
      toast({
        title: "OTP Sent",
        description: "A 6-digit code has been generated for your phone",
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
      // Verify OTP from database
      const { data: otpData, error: otpError } = await supabase
        .from('phone_otps')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('otp_code', otp)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (otpError || !otpData) {
        toast({
          title: "Invalid OTP",
          description: "The code you entered is incorrect or has expired",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Mark OTP as verified
      await supabase
        .from('phone_otps')
        .update({ verified: true })
        .eq('id', otpData.id);

      // Create or sign in user with phone number
      // Using phone as email format for Supabase auth
      const email = `${phoneNumber}@bolt91.app`;
      const password = `bolt91_${phoneNumber}_secure`;

      // Try to sign in first
      let { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If sign in fails, create new account
      if (signInError) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone: phoneNumber,
            },
          },
        });

        if (signUpError) throw signUpError;
        signInData = signUpData;
      }

      if (!signInData.user) {
        throw new Error("Failed to authenticate user");
      }

      toast({
        title: "Success",
        description: "You have been successfully logged in",
      });

      navigate("/bookings");
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
                    setGeneratedOTP("");
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

      <OTPDialog
        open={showOTPDialog}
        onOpenChange={setShowOTPDialog}
        otpCode={generatedOTP}
      />
    </div>
  );
}
