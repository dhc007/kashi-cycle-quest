-- Add security deposit column to accessories table
ALTER TABLE public.accessories 
ADD COLUMN security_deposit DECIMAL(10,2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.accessories.security_deposit IS 'Security deposit amount for this accessory';