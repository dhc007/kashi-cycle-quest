-- Fix search path for generate_partner_code function
DROP FUNCTION IF EXISTS generate_partner_code(TEXT);

CREATE OR REPLACE FUNCTION generate_partner_code(p_partner_type TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  max_num INTEGER;
  new_code TEXT;
BEGIN
  -- Determine prefix based on partner type
  IF p_partner_type = 'guest_house' THEN
    prefix := 'GH';
  ELSE
    prefix := 'RP';
  END IF;
  
  -- Get the maximum number for this prefix
  SELECT COALESCE(MAX(CAST(SUBSTRING(partner_code FROM '[0-9]+') AS INTEGER)), 0)
  INTO max_num
  FROM public.partners
  WHERE partner_code LIKE prefix || '%';
  
  -- Generate new code
  new_code := prefix || LPAD((max_num + 1)::TEXT, 3, '0');
  
  RETURN new_code;
END;
$$;