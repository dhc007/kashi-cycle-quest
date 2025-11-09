import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onVerified: (verified: boolean) => void;
  verified: boolean;
}

export const PhoneInput = ({ value, onChange, onVerified, verified }: PhoneInputProps) => {
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendOTP = async () => {
    if (value.length !== 10) {
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
        body: { phoneNumber: value }
      });

      if (error) throw error;

      if (data.success) {
        setOtpSent(true);
        sessionStorage.setItem('verifiedPhone', value);
        toast({
          title: "OTP Sent",
          description: "A 6-digit code has been sent to your phone",
        });
      } else {
        throw new Error(data.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({
        title: "Failed to Send OTP",
        description: error.message || "Please try again",
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
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phoneNumber: value, code: otp }
      });

      if (error) throw error;

      if (data.success) {
        onVerified(true);
        sessionStorage.setItem('verifiedPhone', value);
        toast({
          title: "Phone Verified",
          description: "Your phone number has been successfully verified",
        });
      } else {
        throw new Error('Invalid OTP code');
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Please check your code and try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Phone Number</Label>
        <div className="flex gap-2">
          <Input
            type="tel"
            placeholder="10-digit mobile number"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
            disabled={verified}
            maxLength={10}
          />
          {!verified && !otpSent && (
            <Button onClick={sendOTP} disabled={loading || value.length !== 10}>
              Send OTP
            </Button>
          )}
        </div>
      </div>

      {otpSent && !verified && (
        <div className="space-y-2 animate-fade-in">
          <Label>Enter OTP</Label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
            />
            <Button onClick={verifyOTP} disabled={loading}>
              {loading ? "Verifying..." : "Verify"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            OTP valid for 10 minutes • 3 attempts remaining
          </p>
        </div>
      )}

      {verified && (
        <div className="text-sm text-green-600 flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-green-600 rounded-full"></span>
          Phone number verified
        </div>
      )}
    </div>
  );
};
