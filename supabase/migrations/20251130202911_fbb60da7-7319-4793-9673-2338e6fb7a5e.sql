-- Make cycle_id nullable in bookings to preserve history when cycles are deleted
ALTER TABLE public.bookings 
ALTER COLUMN cycle_id DROP NOT NULL;

-- Drop existing foreign key and recreate with ON DELETE SET NULL
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_cycle_id_fkey;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_cycle_id_fkey 
FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE SET NULL;

-- For booking_accessories, allow accessory_id to be null and set ON DELETE SET NULL
ALTER TABLE public.booking_accessories 
ALTER COLUMN accessory_id DROP NOT NULL;

ALTER TABLE public.booking_accessories 
DROP CONSTRAINT IF EXISTS booking_accessories_accessory_id_fkey;

ALTER TABLE public.booking_accessories 
ADD CONSTRAINT booking_accessories_accessory_id_fkey 
FOREIGN KEY (accessory_id) REFERENCES public.accessories(id) ON DELETE SET NULL;