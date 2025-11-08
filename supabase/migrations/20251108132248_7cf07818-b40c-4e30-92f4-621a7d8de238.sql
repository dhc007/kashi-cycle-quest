-- Fix search path for check_cycle_availability function
CREATE OR REPLACE FUNCTION public.check_cycle_availability(
  p_cycle_id UUID,
  p_pickup_date DATE,
  p_return_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix search path for check_accessory_availability function
CREATE OR REPLACE FUNCTION public.check_accessory_availability(
  p_accessory_id UUID,
  p_pickup_date DATE,
  p_return_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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