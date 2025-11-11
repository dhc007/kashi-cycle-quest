-- Fix RLS policies for document uploads in storage
CREATE POLICY "Admins can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add quantity field to cycles table
ALTER TABLE public.cycles
ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1 NOT NULL;

-- Create pricing_plans table for centralized pricing management
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('cycle', 'accessory')),
  item_id uuid NOT NULL,
  price_per_hour numeric,
  price_per_day numeric NOT NULL,
  price_per_week numeric,
  price_per_month numeric,
  price_per_year numeric,
  security_deposit_day numeric DEFAULT 2000,
  security_deposit_week numeric DEFAULT 3000,
  security_deposit_month numeric DEFAULT 5000,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_type, item_id)
);

-- Enable RLS on pricing_plans
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for pricing_plans
CREATE POLICY "Anyone can view active pricing plans"
ON public.pricing_plans FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage pricing plans"
ON public.pricing_plans FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger for pricing_plans
CREATE TRIGGER update_pricing_plans_updated_at
BEFORE UPDATE ON public.pricing_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing pricing data from cycles to pricing_plans
INSERT INTO public.pricing_plans (
  item_type,
  item_id,
  price_per_hour,
  price_per_day,
  price_per_week,
  price_per_month,
  price_per_year,
  security_deposit_day,
  security_deposit_week,
  security_deposit_month,
  is_active
)
SELECT
  'cycle',
  id,
  price_per_hour,
  price_per_day,
  price_per_week,
  price_per_month,
  price_per_year,
  security_deposit_day,
  security_deposit_week,
  security_deposit_month,
  is_active
FROM public.cycles
ON CONFLICT (item_type, item_id) DO UPDATE SET
  price_per_hour = EXCLUDED.price_per_hour,
  price_per_day = EXCLUDED.price_per_day,
  price_per_week = EXCLUDED.price_per_week,
  price_per_month = EXCLUDED.price_per_month,
  price_per_year = EXCLUDED.price_per_year,
  security_deposit_day = EXCLUDED.security_deposit_day,
  security_deposit_week = EXCLUDED.security_deposit_week,
  security_deposit_month = EXCLUDED.security_deposit_month;

-- Migrate existing pricing data from accessories to pricing_plans
INSERT INTO public.pricing_plans (
  item_type,
  item_id,
  price_per_day,
  is_active
)
SELECT
  'accessory',
  id,
  price_per_day,
  is_active
FROM public.accessories
ON CONFLICT (item_type, item_id) DO UPDATE SET
  price_per_day = EXCLUDED.price_per_day;