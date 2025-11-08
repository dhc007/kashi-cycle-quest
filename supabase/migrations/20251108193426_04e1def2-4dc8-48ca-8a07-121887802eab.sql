-- Add yearly pricing to cycles table
ALTER TABLE public.cycles ADD COLUMN IF NOT EXISTS price_per_year NUMERIC;

-- Update the cycles table to allow yearly rentals
UPDATE public.cycles SET price_per_year = 50000 WHERE price_per_year IS NULL;