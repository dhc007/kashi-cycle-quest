-- Add unique tracking fields to cycles table
ALTER TABLE public.cycles
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS model_number TEXT,
ADD COLUMN IF NOT EXISTS internal_tracking_id TEXT,
ADD COLUMN IF NOT EXISTS user_manual_url TEXT;

-- Add unique tracking fields to accessories table
ALTER TABLE public.accessories
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS model_number TEXT,
ADD COLUMN IF NOT EXISTS internal_tracking_id TEXT,
ADD COLUMN IF NOT EXISTS user_manual_url TEXT;

-- Add comment for specifications field to indicate new format
COMMENT ON COLUMN public.cycles.specifications IS 'Free-form text describing specifications. Example: 36v 250 watt ultra standard kit, 10.4 ah hard pack Lithium ion Detachable battery, Plastic mudgaurds, 36v 2amp autocutoff charger, 85% fitted bicycle skd condition';