-- Create booking-documents storage bucket for temporary booking document uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('booking-documents', 'booking-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload documents (they'll be moved/deleted after booking is created)
CREATE POLICY "Anyone can upload booking documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'booking-documents');

-- Allow anyone to read booking documents
CREATE POLICY "Anyone can view booking documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'booking-documents');

-- Allow anyone to delete their own booking documents
CREATE POLICY "Anyone can delete booking documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'booking-documents');