-- Add partner_type to partners table
ALTER TABLE partners ADD COLUMN IF NOT EXISTS partner_type text NOT NULL DEFAULT 'cafe/retail';

-- Add check constraint for partner_type
ALTER TABLE partners ADD CONSTRAINT partner_type_check 
CHECK (partner_type IN ('guest_house', 'cafe/retail'));

COMMENT ON COLUMN partners.partner_type IS 'Type of partner: guest_house or cafe/retail';