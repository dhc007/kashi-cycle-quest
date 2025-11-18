-- Fix 1: Secure booking-documents storage bucket
-- Drop all existing policies for booking-documents bucket
DROP POLICY IF EXISTS "Anyone can upload booking documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view booking documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete booking documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all documents" ON storage.objects;

-- Create user-owned document policies
CREATE POLICY "Users can upload own booking documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'booking-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own booking documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'booking-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own booking documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'booking-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all booking documents for verification
CREATE POLICY "Admins can view all booking documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'booking-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 2: Create atomic coupon validation function
CREATE OR REPLACE FUNCTION public.apply_coupon(
  p_coupon_id UUID,
  p_user_id UUID,
  p_booking_id UUID,
  p_discount_amount NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
BEGIN
  -- Lock coupon row for update
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE id = p_coupon_id
  FOR UPDATE;
  
  -- Check if coupon exists and is active
  IF v_coupon.id IS NULL OR v_coupon.is_active = false THEN
    RETURN FALSE;
  END IF;
  
  -- Check if coupon has reached max uses
  IF v_coupon.max_uses IS NOT NULL AND 
     v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN FALSE;
  END IF;
  
  -- Atomically increment used_count
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = p_coupon_id;
  
  -- Record usage
  INSERT INTO public.coupon_usage (
    coupon_id, user_id, booking_id, discount_amount
  ) VALUES (
    p_coupon_id, p_user_id, p_booking_id, p_discount_amount
  );
  
  RETURN TRUE;
END;
$$;

-- Fix 3: Create rate limiting table for OTP
CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_phone ON public.otp_rate_limits(phone_number);

-- Enable RLS on rate limits table
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow system to manage rate limits
CREATE POLICY "System can manage rate limits"
ON public.otp_rate_limits
FOR ALL
USING (true);