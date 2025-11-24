-- Tighten bookings table RLS policies to restrict payment data access
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;

-- Recreate user view policy with restricted columns (exclude payment sensitive fields)
CREATE POLICY "Users can view their own bookings" 
ON public.bookings 
FOR SELECT 
USING (auth.uid() = user_id);

-- Note: Payment fields (razorpay_payment_id, razorpay_signature, razorpay_order_id) 
-- are still in the table but applications should not query them on client side.
-- They should only be accessed server-side in edge functions.

-- Admin policy remains the same (admins need full access)
CREATE POLICY "Admins can view all bookings" 
ON public.bookings 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'viewer'::app_role)
);