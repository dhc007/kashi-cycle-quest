-- Add new fields to bookings table for workflows
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS cycle_returned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cycle_inspected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cycle_condition text,
ADD COLUMN IF NOT EXISTS deposit_returned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS deposit_refund_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS extension_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS extension_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS extension_return_date date,
ADD COLUMN IF NOT EXISTS extension_additional_cost numeric DEFAULT 0;

-- Create cycle_maintenance table
CREATE TABLE IF NOT EXISTS public.cycle_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.cycles(id),
  reported_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  maintenance_type text NOT NULL,
  description text,
  cost numeric DEFAULT 0,
  performed_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create damage_reports table
CREATE TABLE IF NOT EXISTS public.damage_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  cycle_id uuid NOT NULL REFERENCES public.cycles(id),
  reported_at timestamp with time zone NOT NULL DEFAULT now(),
  damage_description text NOT NULL,
  damage_cost numeric NOT NULL DEFAULT 0,
  photo_urls text[],
  deducted_from_deposit boolean DEFAULT false,
  additional_charge_paid boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create booking_extensions table for tracking extension requests
CREATE TABLE IF NOT EXISTS public.booking_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  requested_return_date date NOT NULL,
  additional_cost numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamp with time zone,
  approved_by uuid REFERENCES auth.users(id),
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  sent_at timestamp with time zone,
  read_at timestamp with time zone,
  email_sent boolean DEFAULT false,
  sms_sent boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.cycle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cycle_maintenance
CREATE POLICY "Admins can view all maintenance records"
  ON public.cycle_maintenance FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'viewer'));

CREATE POLICY "Admins can create maintenance records"
  ON public.cycle_maintenance FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can update maintenance records"
  ON public.cycle_maintenance FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for damage_reports
CREATE POLICY "Admins can view all damage reports"
  ON public.damage_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'viewer'));

CREATE POLICY "Users can view their own damage reports"
  ON public.damage_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = damage_reports.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create damage reports"
  ON public.damage_reports FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can update damage reports"
  ON public.damage_reports FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for booking_extensions
CREATE POLICY "Users can view their own extension requests"
  ON public.booking_extensions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_extensions.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all extension requests"
  ON public.booking_extensions FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'viewer'));

CREATE POLICY "Users can create extension requests"
  ON public.booking_extensions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_extensions.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update extension requests"
  ON public.booking_extensions FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_cycle_maintenance_updated_at
  BEFORE UPDATE ON public.cycle_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_damage_reports_updated_at
  BEFORE UPDATE ON public.damage_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booking_extensions_updated_at
  BEFORE UPDATE ON public.booking_extensions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();