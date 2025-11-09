-- Make partner_id nullable with default NULL in bookings table
ALTER TABLE bookings 
  ALTER COLUMN partner_id DROP NOT NULL,
  ALTER COLUMN partner_id SET DEFAULT NULL;

-- Update existing bookings to set partner_id to NULL where invalid
UPDATE bookings 
SET partner_id = NULL 
WHERE partner_id IS NOT NULL AND partner_id NOT IN (SELECT id FROM partners);