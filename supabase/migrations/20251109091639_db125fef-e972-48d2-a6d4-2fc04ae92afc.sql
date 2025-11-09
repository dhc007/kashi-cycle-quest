-- Fix RLS policies for CRUD operations

-- Cycles table policies
CREATE POLICY "Admins can insert cycles" ON public.cycles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cycles" ON public.cycles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Accessories table policies
CREATE POLICY "Admins can insert accessories" ON public.accessories
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete accessories" ON public.accessories
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Partners table policies
CREATE POLICY "Admins can insert partners" ON public.partners
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update partners" ON public.partners
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete partners" ON public.partners
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Bookings table - allow admins to view all bookings
CREATE POLICY "Admins can view all bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'viewer'::app_role));

-- Bookings table - allow admins to update bookings
CREATE POLICY "Admins can update all bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Booking accessories - allow admins to view all
CREATE POLICY "Admins can view all booking accessories" ON public.booking_accessories
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'viewer'::app_role));

-- Profiles - allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'viewer'::app_role));

-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('cycles', 'cycles', true),
  ('accessories', 'accessories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for cycles bucket
CREATE POLICY "Public can view cycle images" ON storage.objects
  FOR SELECT USING (bucket_id = 'cycles');

CREATE POLICY "Admins can upload cycle images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cycles' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cycle images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'cycles' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cycle images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cycles' AND has_role(auth.uid(), 'admin'::app_role));

-- Storage policies for accessories bucket
CREATE POLICY "Public can view accessory images" ON storage.objects
  FOR SELECT USING (bucket_id = 'accessories');

CREATE POLICY "Admins can upload accessory images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'accessories' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update accessory images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'accessories' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete accessory images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'accessories' AND has_role(auth.uid(), 'admin'::app_role));