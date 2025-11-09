-- Add landmark and google_maps_link columns to partners table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS landmark text,
ADD COLUMN IF NOT EXISTS google_maps_link text;

-- Make latitude and longitude nullable (they should already be nullable based on the schema)
ALTER TABLE public.partners 
ALTER COLUMN latitude DROP NOT NULL,
ALTER COLUMN longitude DROP NOT NULL;