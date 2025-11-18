-- Add logo_url column to partners table
ALTER TABLE public.partners
ADD COLUMN logo_url TEXT;

COMMENT ON COLUMN public.partners.logo_url IS 'URL to partner logo image stored in storage bucket';