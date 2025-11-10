-- Add video_url and media_urls to cycles table
ALTER TABLE public.cycles
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Update internal_details for cycles to include new fields
COMMENT ON COLUMN public.cycles.internal_details IS 'Internal admin details: vendor, warranty, invoice, warranty_file_url, invoice_file_url, date_received, purchase_amount';

-- Add internal_details to accessories table
ALTER TABLE public.accessories
ADD COLUMN IF NOT EXISTS internal_details JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.accessories.internal_details IS 'Internal admin details: vendor_name, model_number, date_of_purchase, purchase_amount, warranty_file_url, invoice_file_url';