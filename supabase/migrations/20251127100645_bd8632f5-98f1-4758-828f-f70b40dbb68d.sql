-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active accessories" ON public.accessories;
DROP POLICY IF EXISTS "Admins can update accessories" ON public.accessories;

-- Create updated SELECT policy - admins/managers/viewers can see ALL accessories, others only active
CREATE POLICY "View accessories policy" 
ON public.accessories 
FOR SELECT 
USING (
  is_active = true 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'viewer'::app_role)
);

-- Create updated UPDATE policy with WITH CHECK clause
CREATE POLICY "Admins can update accessories" 
ON public.accessories 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));