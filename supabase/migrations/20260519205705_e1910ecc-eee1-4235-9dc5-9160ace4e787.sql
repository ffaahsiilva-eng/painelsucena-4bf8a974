DROP POLICY IF EXISTS "Authenticated users can upload daily shift PNGs" ON storage.objects;
CREATE POLICY "Authenticated users can upload daily shift PNGs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-assets'
  AND (storage.foldername(name))[1] = 'parte-diaria'
);

DROP POLICY IF EXISTS "Authenticated users can update daily shift PNGs" ON storage.objects;
CREATE POLICY "Authenticated users can update daily shift PNGs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-assets'
  AND (storage.foldername(name))[1] = 'parte-diaria'
)
WITH CHECK (
  bucket_id = 'site-assets'
  AND (storage.foldername(name))[1] = 'parte-diaria'
);