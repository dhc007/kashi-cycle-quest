-- CRITICAL SECURITY FIX: Secure OTP tables
-- These tables should NEVER be readable by clients

-- Drop existing public policies on phone_otps
DROP POLICY IF EXISTS "Anyone can create OTP requests" ON public.phone_otps;
DROP POLICY IF EXISTS "Anyone can view OTPs for verification" ON public.phone_otps;

-- Drop existing public policies on otp_rate_limits
DROP POLICY IF EXISTS "System can manage rate limits" ON public.otp_rate_limits;

-- Create secure policies - only service role can access
-- phone_otps: No client access at all
CREATE POLICY "Service role only access to phone_otps"
ON public.phone_otps
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- otp_rate_limits: No client access at all
CREATE POLICY "Service role only access to otp_rate_limits"
ON public.otp_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;