-- Add foreign key relationship from profiles.user_id to auth.users
-- Check if constraint doesn't exist first to avoid errors
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_profiles_auth_users'
  ) THEN
    ALTER TABLE profiles 
    ADD CONSTRAINT fk_profiles_auth_users 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key relationship from bookings.user_id to profiles.user_id
-- This enables proper joins between bookings and profiles
ALTER TABLE bookings 
ADD CONSTRAINT fk_bookings_profiles 
FOREIGN KEY (user_id) 
REFERENCES profiles(user_id) 
ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);