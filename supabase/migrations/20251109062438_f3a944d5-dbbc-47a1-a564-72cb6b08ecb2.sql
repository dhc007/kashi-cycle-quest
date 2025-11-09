-- Add monthly pricing and duration-specific security deposits to cycles table
ALTER TABLE public.cycles 
ADD COLUMN IF NOT EXISTS price_per_month numeric,
ADD COLUMN IF NOT EXISTS security_deposit_day numeric DEFAULT 2000,
ADD COLUMN IF NOT EXISTS security_deposit_week numeric DEFAULT 3000,
ADD COLUMN IF NOT EXISTS security_deposit_month numeric DEFAULT 5000;

-- Update existing cycles with default values if they don't have them
UPDATE public.cycles 
SET 
  security_deposit_day = COALESCE(security_deposit_day, 2000),
  security_deposit_week = COALESCE(security_deposit_week, 3000),
  security_deposit_month = COALESCE(security_deposit_month, 5000)
WHERE security_deposit_day IS NULL 
   OR security_deposit_week IS NULL 
   OR security_deposit_month IS NULL;

-- Make the new columns NOT NULL after setting defaults
ALTER TABLE public.cycles 
ALTER COLUMN security_deposit_day SET NOT NULL,
ALTER COLUMN security_deposit_week SET NOT NULL,
ALTER COLUMN security_deposit_month SET NOT NULL;