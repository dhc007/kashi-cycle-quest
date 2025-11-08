-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  id_proof_url TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cycles table for inventory
CREATE TABLE public.cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  description TEXT,
  price_per_hour DECIMAL(10, 2) NOT NULL,
  price_per_day DECIMAL(10, 2) NOT NULL,
  price_per_week DECIMAL(10, 2) NOT NULL,
  security_deposit DECIMAL(10, 2) NOT NULL DEFAULT 500,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  specifications JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create accessories table
CREATE TABLE public.accessories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_per_day DECIMAL(10, 2) NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partners table for pickup locations
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.cycles(id),
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  
  -- Booking details
  pickup_date DATE NOT NULL,
  pickup_time TEXT NOT NULL,
  return_date DATE NOT NULL,
  duration_type TEXT NOT NULL, -- '4hours', '1day', '3days', '1week'
  
  -- Pricing
  cycle_rental_cost DECIMAL(10, 2) NOT NULL,
  accessories_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  insurance_cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
  gst DECIMAL(10, 2) NOT NULL,
  security_deposit DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Payment details
  payment_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_method TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  
  -- Status
  booking_status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, active, completed, cancelled
  
  -- Additional fields
  has_insurance BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create booking_accessories junction table
CREATE TABLE public.booking_accessories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  accessory_id UUID NOT NULL REFERENCES public.accessories(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  days INTEGER NOT NULL,
  price_per_day DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_accessories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for cycles (public read)
CREATE POLICY "Anyone can view active cycles"
  ON public.cycles FOR SELECT
  USING (is_active = true);

-- RLS Policies for accessories (public read)
CREATE POLICY "Anyone can view active accessories"
  ON public.accessories FOR SELECT
  USING (is_active = true);

-- RLS Policies for partners (public read)
CREATE POLICY "Anyone can view active partners"
  ON public.partners FOR SELECT
  USING (is_active = true);

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for booking_accessories
CREATE POLICY "Users can view their booking accessories"
  ON public.booking_accessories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_accessories.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their booking accessories"
  ON public.booking_accessories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_accessories.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cycles_updated_at
  BEFORE UPDATE ON public.cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accessories_updated_at
  BEFORE UPDATE ON public.accessories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check and update inventory
CREATE OR REPLACE FUNCTION public.check_cycle_availability(
  p_cycle_id UUID,
  p_pickup_date DATE,
  p_return_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_quantity INTEGER;
  v_booked_quantity INTEGER;
BEGIN
  -- Get total quantity
  SELECT total_quantity INTO v_total_quantity
  FROM public.cycles
  WHERE id = p_cycle_id AND is_active = true;
  
  -- Get booked quantity for the date range
  SELECT COALESCE(COUNT(*), 0) INTO v_booked_quantity
  FROM public.bookings
  WHERE cycle_id = p_cycle_id
    AND booking_status IN ('confirmed', 'active')
    AND pickup_date <= p_return_date
    AND return_date >= p_pickup_date;
  
  RETURN v_total_quantity - v_booked_quantity;
END;
$$;

-- Function to check accessory availability
CREATE OR REPLACE FUNCTION public.check_accessory_availability(
  p_accessory_id UUID,
  p_pickup_date DATE,
  p_return_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_quantity INTEGER;
  v_booked_quantity INTEGER;
BEGIN
  -- Get total quantity
  SELECT total_quantity INTO v_total_quantity
  FROM public.accessories
  WHERE id = p_accessory_id AND is_active = true;
  
  -- Get booked quantity for the date range
  SELECT COALESCE(SUM(ba.quantity), 0) INTO v_booked_quantity
  FROM public.booking_accessories ba
  JOIN public.bookings b ON ba.booking_id = b.id
  WHERE ba.accessory_id = p_accessory_id
    AND b.booking_status IN ('confirmed', 'active')
    AND b.pickup_date <= p_return_date
    AND b.return_date >= p_pickup_date;
  
  RETURN v_total_quantity - v_booked_quantity;
END;
$$;

-- Insert sample data
INSERT INTO public.cycles (name, model, price_per_hour, price_per_day, price_per_week, security_deposit, total_quantity, available_quantity, is_active) VALUES
  ('Bolt91 Electric Cycle', 'Model X1', 50, 300, 1500, 500, 10, 10, true);

INSERT INTO public.accessories (name, description, price_per_day, total_quantity, available_quantity, is_active) VALUES
  ('Meta Ray-Ban Glasses', 'Smart glasses with camera', 100, 5, 5, true),
  ('GoPro Camera', 'Action camera for recording', 150, 3, 3, true),
  ('Smart Helmet', 'Bluetooth enabled smart helmet', 80, 8, 8, true),
  ('Pump', 'Portable air pump', 20, 10, 10, true);

INSERT INTO public.partners (name, address, city, state, pincode, phone_number) VALUES
  ('Bolt91 Hub - MG Road', '123 MG Road, Near Metro Station', 'Bangalore', 'Karnataka', '560001', '+91-9876543210'),
  ('Bolt91 Hub - Koramangala', '456 Koramangala 4th Block', 'Bangalore', 'Karnataka', '560034', '+91-9876543211');