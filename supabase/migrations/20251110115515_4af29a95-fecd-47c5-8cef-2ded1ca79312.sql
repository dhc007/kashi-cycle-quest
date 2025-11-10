-- Update check_cycle_availability to exclude past bookings
CREATE OR REPLACE FUNCTION public.check_cycle_availability(p_cycle_id uuid, p_pickup_date date, p_return_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_quantity INTEGER;
  v_booked_quantity INTEGER;
BEGIN
  -- Get total quantity
  SELECT total_quantity INTO v_total_quantity
  FROM public.cycles
  WHERE id = p_cycle_id AND is_active = true;
  
  -- Get booked quantity for the date range
  -- Exclude past bookings (return_date < today)
  SELECT COALESCE(COUNT(*), 0) INTO v_booked_quantity
  FROM public.bookings
  WHERE cycle_id = p_cycle_id
    AND booking_status IN ('confirmed', 'active')
    AND pickup_date <= p_return_date
    AND return_date >= p_pickup_date
    AND return_date >= CURRENT_DATE;
  
  RETURN v_total_quantity - v_booked_quantity;
END;
$function$;

-- Update check_accessory_availability to exclude past bookings
CREATE OR REPLACE FUNCTION public.check_accessory_availability(p_accessory_id uuid, p_pickup_date date, p_return_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_quantity INTEGER;
  v_booked_quantity INTEGER;
BEGIN
  -- Get total quantity
  SELECT total_quantity INTO v_total_quantity
  FROM public.accessories
  WHERE id = p_accessory_id AND is_active = true;
  
  -- Get booked quantity for the date range
  -- Exclude past bookings (return_date < today)
  SELECT COALESCE(SUM(ba.quantity), 0) INTO v_booked_quantity
  FROM public.booking_accessories ba
  JOIN public.bookings b ON ba.booking_id = b.id
  WHERE ba.accessory_id = p_accessory_id
    AND b.booking_status IN ('confirmed', 'active')
    AND b.pickup_date <= p_return_date
    AND b.return_date >= p_pickup_date
    AND b.return_date >= CURRENT_DATE;
  
  RETURN v_total_quantity - v_booked_quantity;
END;
$function$;