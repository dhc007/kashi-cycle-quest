import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface OTPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otpCode: string;
}

export const OTPDialog = ({ open, onOpenChange, otpCode }: OTPDialogProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(otpCode);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "OTP code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your OTP Code</DialogTitle>
          <DialogDescription>
            Use this code to verify your phone number (Mock OTP for testing)
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-6 space-y-4">
          <p className="text-4xl font-bold tracking-widest text-primary">
            {otpCode}
          </p>
          <Button onClick={copyToClipboard} variant="outline" className="gap-2">
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Code
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            This is a mock OTP for testing purposes
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
