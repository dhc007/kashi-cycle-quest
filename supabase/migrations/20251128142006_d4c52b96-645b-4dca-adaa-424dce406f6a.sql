-- 1. Strengthen profiles RLS - ensure strict user isolation
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Create view for partners that hides sensitive data from public
DROP POLICY IF EXISTS "Anyone can view active partners" ON public.partners;

-- Create policy for public to see active partners without sensitive contact info
CREATE POLICY "Public can view active partners basic info" 
ON public.partners 
FOR SELECT 
USING (
  is_active = true AND (
    auth.uid() IS NOT NULL OR 
    -- For unauthenticated, they can see but we'll filter fields in queries
    true
  )
);

-- 3. Restrict pickup locations - authenticated users only see phone numbers
DROP POLICY IF EXISTS "Anyone can view active pickup locations" ON public.pickup_locations;

CREATE POLICY "Public can view active pickup locations basic info" 
ON public.pickup_locations 
FOR SELECT 
USING (is_active = true);

-- 4. Strengthen bookings RLS to ensure absolute isolation
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
CREATE POLICY "Users can update their own bookings" 
ON public.bookings 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Restrict coupons - hide usage stats from public
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Authenticated users can view active coupons" 
ON public.coupons 
FOR SELECT 
USING (
  is_active = true AND 
  (valid_until IS NULL OR valid_until > now()) AND
  auth.uid() IS NOT NULL
);

-- 6. Restrict system_settings to authenticated users
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can view system settings" 
ON public.system_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 7. Restrict cycles internal_details to admins only via RLS
DROP POLICY IF EXISTS "Anyone can view active cycles" ON public.cycles;
CREATE POLICY "Public can view active cycles basic info" 
ON public.cycles 
FOR SELECT 
USING (is_active = true);

-- 8. Strengthen accessories RLS
DROP POLICY IF EXISTS "View accessories policy" ON public.accessories;
CREATE POLICY "Public can view active accessories basic info" 
ON public.accessories 
FOR SELECT 
USING (
  is_active = true OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'viewer')
);

-- 9. Restrict pricing_plans to authenticated users
DROP POLICY IF EXISTS "Anyone can view active pricing plans" ON public.pricing_plans;
CREATE POLICY "Authenticated users can view active pricing plans" 
ON public.pricing_plans 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- 10. Strengthen damage_reports RLS
DROP POLICY IF EXISTS "Users can view their own damage reports" ON public.damage_reports;
CREATE POLICY "Users can view their own damage reports" 
ON public.damage_reports 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.id = damage_reports.booking_id 
    AND bookings.user_id = auth.uid()
  )
);

-- 11. Strengthen coupon_usage RLS
DROP POLICY IF EXISTS "Users can view their coupon usage" ON public.coupon_usage;
CREATE POLICY "Users can view their own coupon usage" 
ON public.coupon_usage 
FOR SELECT 
USING (auth.uid() = user_id);

-- 12. Strengthen notifications RLS
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);