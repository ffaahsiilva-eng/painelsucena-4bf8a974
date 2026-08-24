-- Allow all authenticated users to upload to site-assets bucket under instacena/ folder
CREATE POLICY "Authenticated users can upload instacena media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'site-assets'
  AND (storage.foldername(name))[1] = 'instacena'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete their own instacena media
CREATE POLICY "Authenticated users can delete instacena media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'site-assets'
  AND (storage.foldername(name))[1] = 'instacena'
  AND auth.uid() IS NOT NULL
);