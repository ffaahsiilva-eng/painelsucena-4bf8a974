
-- Allow authenticated users to upload their own avatar to site-assets
CREATE POLICY "Users can upload their own avatar to site-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'site-assets' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update (upsert) their own avatar
CREATE POLICY "Users can update their own avatar in site-assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'site-assets' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
