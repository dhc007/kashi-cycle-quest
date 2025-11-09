-- Add cancellation fields to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancellation_reason text,
ADD COLUMN IF NOT EXISTS cancellation_status text DEFAULT 'none' CHECK (cancellation_status IN ('none', 'requested', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS cancellation_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id);