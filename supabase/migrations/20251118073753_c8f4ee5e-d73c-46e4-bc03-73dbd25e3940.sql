-- Add terms acceptance tracking to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT 'v1.0';

-- Add comment for clarity
COMMENT ON COLUMN public.bookings.terms_accepted_at IS 'Timestamp when user accepted terms and conditions';
COMMENT ON COLUMN public.bookings.terms_version IS 'Version of terms accepted by user';