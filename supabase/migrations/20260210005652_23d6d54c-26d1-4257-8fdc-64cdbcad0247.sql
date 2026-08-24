
-- Add photo columns to site_inspection_tasks
ALTER TABLE public.site_inspection_tasks
  ADD COLUMN before_photo_url TEXT,
  ADD COLUMN after_photo_url TEXT;

-- Create storage bucket for inspection photos
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', true);

-- Storage policies
CREATE POLICY "Anyone can view inspection photos" ON storage.objects FOR SELECT USING (bucket_id = 'inspection-photos');
CREATE POLICY "Authenticated users can upload inspection photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'inspection-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update inspection photos" ON storage.objects FOR UPDATE USING (bucket_id = 'inspection-photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete inspection photos" ON storage.objects FOR DELETE USING (bucket_id = 'inspection-photos' AND auth.uid() IS NOT NULL);
