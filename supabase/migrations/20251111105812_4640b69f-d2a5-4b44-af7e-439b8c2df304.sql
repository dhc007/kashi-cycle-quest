-- Add operation hours system setting
INSERT INTO public.system_settings (key, value)
VALUES ('operation_hours', '{"start": "09:00", "end": "19:00", "start_display": "9:00 AM", "end_display": "7:00 PM"}'::jsonb)
ON CONFLICT (key) DO NOTHING;