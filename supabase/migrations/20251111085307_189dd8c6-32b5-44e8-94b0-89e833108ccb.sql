-- Add display_serial column to cycles table
ALTER TABLE public.cycles ADD COLUMN display_serial TEXT;

-- Add display_serial column to accessories table
ALTER TABLE public.accessories ADD COLUMN display_serial TEXT;

-- Function to generate cycle serial number
CREATE OR REPLACE FUNCTION public.generate_cycle_serial()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_num INTEGER;
  new_serial TEXT;
BEGIN
  -- Get the maximum number from existing serials
  SELECT COALESCE(MAX(CAST(SUBSTRING(display_serial FROM '[0-9]+') AS INTEGER)), 0)
  INTO max_num
  FROM public.cycles
  WHERE display_serial LIKE 'CYC%';
  
  -- Generate new serial
  new_serial := 'CYC' || LPAD((max_num + 1)::TEXT, 3, '0');
  
  RETURN new_serial;
END;
$$;

-- Function to generate accessory serial number
CREATE OR REPLACE FUNCTION public.generate_accessory_serial()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_num INTEGER;
  new_serial TEXT;
BEGIN
  -- Get the maximum number from existing serials
  SELECT COALESCE(MAX(CAST(SUBSTRING(display_serial FROM '[0-9]+') AS INTEGER)), 0)
  INTO max_num
  FROM public.accessories
  WHERE display_serial LIKE 'ACC%';
  
  -- Generate new serial
  new_serial := 'ACC' || LPAD((max_num + 1)::TEXT, 3, '0');
  
  RETURN new_serial;
END;
$$;

-- Trigger to auto-assign cycle serial on insert
CREATE OR REPLACE FUNCTION public.assign_cycle_serial()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.display_serial IS NULL THEN
    NEW.display_serial := generate_cycle_serial();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_cycle_serial
BEFORE INSERT ON public.cycles
FOR EACH ROW
EXECUTE FUNCTION public.assign_cycle_serial();

-- Trigger to auto-assign accessory serial on insert
CREATE OR REPLACE FUNCTION public.assign_accessory_serial()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.display_serial IS NULL THEN
    NEW.display_serial := generate_accessory_serial();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_accessory_serial
BEFORE INSERT ON public.accessories
FOR EACH ROW
EXECUTE FUNCTION public.assign_accessory_serial();

-- Update existing cycles with serial numbers
DO $$
DECLARE
  cycle_rec RECORD;
  counter INTEGER := 0;
BEGIN
  FOR cycle_rec IN SELECT id FROM public.cycles WHERE display_serial IS NULL ORDER BY created_at LOOP
    counter := counter + 1;
    UPDATE public.cycles 
    SET display_serial = 'CYC' || LPAD(counter::TEXT, 3, '0')
    WHERE id = cycle_rec.id;
  END LOOP;
END $$;

-- Update existing accessories with serial numbers
DO $$
DECLARE
  acc_rec RECORD;
  counter INTEGER := 0;
BEGIN
  FOR acc_rec IN SELECT id FROM public.accessories WHERE display_serial IS NULL ORDER BY created_at LOOP
    counter := counter + 1;
    UPDATE public.accessories 
    SET display_serial = 'ACC' || LPAD(counter::TEXT, 3, '0')
    WHERE id = acc_rec.id;
  END LOOP;
END $$;