-- 1. Add first_name and last_name to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Migrate existing data (split on last space)
UPDATE profiles 
SET 
  first_name = CASE 
    WHEN full_name LIKE '% %' THEN 
      TRIM(SUBSTRING(full_name FROM 1 FOR LENGTH(full_name) - POSITION(' ' IN REVERSE(full_name))))
    ELSE full_name
  END,
  last_name = CASE 
    WHEN full_name LIKE '% %' THEN 
      TRIM(SUBSTRING(full_name FROM LENGTH(full_name) - POSITION(' ' IN REVERSE(full_name)) + 2))
    ELSE ''
  END
WHERE first_name IS NULL;

-- Make columns required
ALTER TABLE profiles 
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

-- 2. Add return_time to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS return_time TEXT DEFAULT '10:00 AM';

-- 3. Allow NULL for partner_id in bookings (for historical completed bookings)
ALTER TABLE bookings 
  ALTER COLUMN partner_id DROP NOT NULL;

-- Handle bookings for the partner to be deleted
UPDATE bookings 
SET partner_id = NULL 
WHERE partner_id = 'ccf30fbb-e687-4679-8384-fd34f5beac79';

-- Delete problematic partner
DELETE FROM partners 
WHERE id = 'ccf30fbb-e687-4679-8384-fd34f5beac79';

-- 4. Create phone_otps table
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- RLS policies for phone_otps
CREATE POLICY "Anyone can create OTP requests"
  ON public.phone_otps FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Anyone can view OTPs for verification"
  ON public.phone_otps FOR SELECT
  TO authenticated, anon
  USING (true);