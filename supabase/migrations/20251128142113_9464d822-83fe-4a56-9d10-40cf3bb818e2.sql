-- Fix partners policy - remove "OR true" to require authentication for contact info
DROP POLICY IF EXISTS "Public can view active partners basic info" ON public.partners;

-- Only authenticated users can see partner contact info
CREATE POLICY "Authenticated users can view active partners" 
ON public.partners 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Also allow admins to see all partners including inactive
CREATE POLICY "Admins can view all partners" 
ON public.partners 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);

-- Restrict pickup locations to authenticated users only
DROP POLICY IF EXISTS "Public can view active pickup locations basic info" ON public.pickup_locations;

CREATE POLICY "Authenticated users can view active pickup locations" 
ON public.pickup_locations 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Allow admins to see all pickup locations
CREATE POLICY "Admins can view all pickup locations" 
ON public.pickup_locations 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);

-- Restrict cycles to authenticated users for basic view
DROP POLICY IF EXISTS "Public can view active cycles basic info" ON public.cycles;

CREATE POLICY "Authenticated users can view active cycles" 
ON public.cycles 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Allow admins to see all cycles
CREATE POLICY "Admins can view all cycles" 
ON public.cycles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);

-- Restrict accessories to authenticated users
DROP POLICY IF EXISTS "Public can view active accessories basic info" ON public.accessories;

CREATE POLICY "Authenticated users can view active accessories" 
ON public.accessories 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Allow admins to see all accessories
CREATE POLICY "Admins can view all accessories" 
ON public.accessories 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);