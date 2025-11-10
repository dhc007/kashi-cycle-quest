-- Add partner codes
ALTER TABLE partners ADD COLUMN IF NOT EXISTS partner_code TEXT UNIQUE;

-- Add cycle internal details and free accessories
ALTER TABLE cycles ADD COLUMN IF NOT EXISTS internal_details JSONB DEFAULT '{"vendor": "", "warranty": "", "invoice": ""}'::jsonb;
ALTER TABLE cycles ADD COLUMN IF NOT EXISTS free_accessories UUID[] DEFAULT ARRAY[]::UUID[];

-- Add fields to profiles for photo and ID proof URLs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS live_photo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_proof_url_updated TEXT;

-- Add fields to cycle_return for multiple photos
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_photos TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create function to generate partner codes
CREATE OR REPLACE FUNCTION generate_partner_code(p_partner_type TEXT)
RETURNS TEXT AS $$
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
  FROM partners
  WHERE partner_code LIKE prefix || '%';
  
  -- Generate new code
  new_code := prefix || LPAD((max_num + 1)::TEXT, 3, '0');
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Update existing partners with codes
DO $$
DECLARE
  partner_rec RECORD;
  new_code TEXT;
BEGIN
  FOR partner_rec IN 
    SELECT id, partner_type 
    FROM partners 
    WHERE partner_code IS NULL
    ORDER BY created_at
  LOOP
    new_code := generate_partner_code(partner_rec.partner_type);
    UPDATE partners SET partner_code = new_code WHERE id = partner_rec.id;
  END LOOP;
END $$;