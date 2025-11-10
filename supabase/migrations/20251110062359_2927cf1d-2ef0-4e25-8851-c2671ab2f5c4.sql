-- Create pickup_locations table
CREATE TABLE public.pickup_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  landmark TEXT,
  phone_number TEXT NOT NULL,
  google_maps_link TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pickup_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pickup_locations
CREATE POLICY "Anyone can view active pickup locations"
  ON public.pickup_locations
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert pickup locations"
  ON public.pickup_locations
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pickup locations"
  ON public.pickup_locations
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete pickup locations"
  ON public.pickup_locations
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_pickup_locations_updated_at
  BEFORE UPDATE ON public.pickup_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add pickup_location_id to bookings table
ALTER TABLE public.bookings
ADD COLUMN pickup_location_id UUID REFERENCES public.pickup_locations(id);