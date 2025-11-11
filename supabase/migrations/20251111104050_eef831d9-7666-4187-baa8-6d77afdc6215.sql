-- Add system setting for allowing bookings when cycles are unavailable
INSERT INTO public.system_settings (key, value, created_at, updated_at)
VALUES (
  'allow_unavailable_bookings',
  '{"enabled": false}'::jsonb,
  now(),
  now()
)
ON CONFLICT (key) DO NOTHING;