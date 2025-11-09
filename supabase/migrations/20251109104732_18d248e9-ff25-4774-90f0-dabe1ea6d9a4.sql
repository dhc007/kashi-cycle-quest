-- Make full_name nullable since we now use first_name and last_name
ALTER TABLE profiles 
  ALTER COLUMN full_name DROP NOT NULL;

-- Update existing profiles to have full_name as concatenation of first + last
UPDATE profiles 
SET full_name = first_name || ' ' || last_name
WHERE full_name IS NULL OR full_name = '';