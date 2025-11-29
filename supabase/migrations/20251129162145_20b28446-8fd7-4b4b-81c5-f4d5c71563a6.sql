-- Add PhonePe payment columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS phonepe_order_id TEXT,
ADD COLUMN IF NOT EXISTS phonepe_transaction_id TEXT;