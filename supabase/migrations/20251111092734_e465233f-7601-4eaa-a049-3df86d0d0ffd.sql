-- Restructure database for better organization and relationships

-- First, let's ensure profiles table is properly structured
-- Drop the unnecessary id column and make user_id the primary key
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE public.profiles ADD PRIMARY KEY (user_id);

-- Add foreign key constraint from profiles to auth.users
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey,
  ADD CONSTRAINT profiles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- Add proper foreign key constraints to bookings table
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_user_id_fkey,
  ADD CONSTRAINT bookings_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(user_id)
    ON DELETE CASCADE;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_cycle_id_fkey,
  ADD CONSTRAINT bookings_cycle_id_fkey
    FOREIGN KEY (cycle_id)
    REFERENCES public.cycles(id)
    ON DELETE RESTRICT;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_partner_id_fkey,
  ADD CONSTRAINT bookings_partner_id_fkey
    FOREIGN KEY (partner_id)
    REFERENCES public.partners(id)
    ON DELETE SET NULL;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_pickup_location_id_fkey,
  ADD CONSTRAINT bookings_pickup_location_id_fkey
    FOREIGN KEY (pickup_location_id)
    REFERENCES public.pickup_locations(id)
    ON DELETE SET NULL;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_coupon_id_fkey,
  ADD CONSTRAINT bookings_coupon_id_fkey
    FOREIGN KEY (coupon_id)
    REFERENCES public.coupons(id)
    ON DELETE SET NULL;

-- Add proper foreign key constraints to booking_accessories
ALTER TABLE public.booking_accessories
  DROP CONSTRAINT IF EXISTS booking_accessories_booking_id_fkey,
  ADD CONSTRAINT booking_accessories_booking_id_fkey
    FOREIGN KEY (booking_id)
    REFERENCES public.bookings(id)
    ON DELETE CASCADE;

ALTER TABLE public.booking_accessories
  DROP CONSTRAINT IF EXISTS booking_accessories_accessory_id_fkey,
  ADD CONSTRAINT booking_accessories_accessory_id_fkey
    FOREIGN KEY (accessory_id)
    REFERENCES public.accessories(id)
    ON DELETE RESTRICT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON public.profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_profiles_last_name ON public.profiles(last_name);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_cycle_id ON public.bookings(cycle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_date ON public.bookings(pickup_date);
CREATE INDEX IF NOT EXISTS idx_bookings_return_date ON public.bookings(return_date);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON public.bookings(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_accessories_booking_id ON public.booking_accessories(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_accessories_accessory_id ON public.booking_accessories(accessory_id);

CREATE INDEX IF NOT EXISTS idx_cycles_display_serial ON public.cycles(display_serial);
CREATE INDEX IF NOT EXISTS idx_cycles_is_active ON public.cycles(is_active);

CREATE INDEX IF NOT EXISTS idx_accessories_display_serial ON public.accessories(display_serial);
CREATE INDEX IF NOT EXISTS idx_accessories_is_active ON public.accessories(is_active);

CREATE INDEX IF NOT EXISTS idx_pickup_locations_city ON public.pickup_locations(city);
CREATE INDEX IF NOT EXISTS idx_pickup_locations_is_active ON public.pickup_locations(is_active);

CREATE INDEX IF NOT EXISTS idx_partners_partner_code ON public.partners(partner_code);
CREATE INDEX IF NOT EXISTS idx_partners_is_active ON public.partners(is_active);

-- Add unique constraints where appropriate
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_number_unique UNIQUE (phone_number);
ALTER TABLE public.cycles ADD CONSTRAINT cycles_display_serial_unique UNIQUE (display_serial);
ALTER TABLE public.accessories ADD CONSTRAINT accessories_display_serial_unique UNIQUE (display_serial);
ALTER TABLE public.partners ADD CONSTRAINT partners_partner_code_unique UNIQUE (partner_code);

-- Add comments for better documentation
COMMENT ON TABLE public.profiles IS 'User profiles with personal information and documents';
COMMENT ON TABLE public.bookings IS 'Cycle rental bookings with payment and status tracking';
COMMENT ON TABLE public.booking_accessories IS 'Accessories added to bookings';
COMMENT ON TABLE public.cycles IS 'Available cycles for rent with pricing and inventory';
COMMENT ON TABLE public.accessories IS 'Available accessories for rent';
COMMENT ON TABLE public.pickup_locations IS 'Physical locations for cycle pickup and return';
COMMENT ON TABLE public.partners IS 'Partner locations (guest houses, cafes, etc.)';

COMMENT ON COLUMN public.profiles.user_id IS 'Primary key - references auth.users';
COMMENT ON COLUMN public.profiles.phone_number IS 'User phone number - unique';
COMMENT ON COLUMN public.bookings.booking_id IS 'Human-readable booking ID';
COMMENT ON COLUMN public.bookings.booking_status IS 'Status: confirmed, active, completed, cancelled';
COMMENT ON COLUMN public.bookings.payment_status IS 'Payment status: pending, completed, failed, refunded';
COMMENT ON COLUMN public.cycles.display_serial IS 'Human-readable serial number (e.g., CYC001)';
COMMENT ON COLUMN public.accessories.display_serial IS 'Human-readable serial number (e.g., ACC001)';