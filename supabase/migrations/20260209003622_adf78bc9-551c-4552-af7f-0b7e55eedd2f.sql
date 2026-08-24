-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Anyone can view announcement images"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload announcement images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'announcements' AND auth.uid() IS NOT NULL);

-- Allow overwrite (upsert)
CREATE POLICY "Authenticated users can update announcement images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'announcements' AND auth.uid() IS NOT NULL);
