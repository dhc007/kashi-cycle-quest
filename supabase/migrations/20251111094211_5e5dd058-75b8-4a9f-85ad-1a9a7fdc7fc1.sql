-- Remove quantity tracking from cycles - each cycle entry = 1 physical cycle

-- First, create new cycles for existing quantity > 1
-- This ensures no data loss
DO $$
DECLARE
  cycle_record RECORD;
  i INTEGER;
BEGIN
  FOR cycle_record IN 
    SELECT * FROM public.cycles WHERE total_quantity > 1
  LOOP
    -- Create additional cycle entries for each quantity
    FOR i IN 2..cycle_record.total_quantity LOOP
      INSERT INTO public.cycles (
        name, model, description, image_url, specifications,
        video_url, media_urls, price_per_hour, price_per_day,
        price_per_week, price_per_month, price_per_year,
        security_deposit, security_deposit_day, security_deposit_week,
        security_deposit_month, serial_number, model_number,
        internal_tracking_id, user_manual_url, internal_details,
        free_accessories, is_active
      ) VALUES (
        cycle_record.name,
        cycle_record.model,
        cycle_record.description,
        cycle_record.image_url,
        cycle_record.specifications,
        cycle_record.video_url,
        cycle_record.media_urls,
        cycle_record.price_per_hour,
        cycle_record.price_per_day,
        cycle_record.price_per_week,
        cycle_record.price_per_month,
        cycle_record.price_per_year,
        cycle_record.security_deposit,
        cycle_record.security_deposit_day,
        cycle_record.security_deposit_week,
        cycle_record.security_deposit_month,
        cycle_record.serial_number,
        cycle_record.model_number,
        cycle_record.internal_tracking_id,
        cycle_record.user_manual_url,
        cycle_record.internal_details,
        cycle_record.free_accessories,
        cycle_record.is_active
      );
    END LOOP;
  END LOOP;
END $$;

-- Now drop the quantity columns
ALTER TABLE public.cycles DROP COLUMN IF EXISTS total_quantity;
ALTER TABLE public.cycles DROP COLUMN IF EXISTS available_quantity;

-- Update the check_cycle_availability function to work with individual cycles
CREATE OR REPLACE FUNCTION public.check_cycle_availability(p_cycle_id uuid, p_pickup_date date, p_return_date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_booked BOOLEAN;
BEGIN
  -- Check if this specific cycle is booked for the date range
  -- Return 0 if booked, 1 if available
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings
    WHERE cycle_id = p_cycle_id
      AND booking_status IN ('confirmed', 'active')
      AND pickup_date <= p_return_date
      AND return_date >= p_pickup_date
      AND return_date >= CURRENT_DATE
  ) INTO v_is_booked;
  
  IF v_is_booked THEN
    RETURN 0;
  ELSE
    RETURN 1;
  END IF;
END;
$function$;

-- Add comment
COMMENT ON TABLE public.cycles IS 'Each row represents one physical cycle (no quantity tracking)';