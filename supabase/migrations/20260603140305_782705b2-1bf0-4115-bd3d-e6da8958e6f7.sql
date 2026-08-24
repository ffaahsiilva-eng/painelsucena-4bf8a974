-- Ensure storage policies are robust for site-assets logos
DROP POLICY IF EXISTS "Admins and moderators can manage logos" ON storage.objects;
CREATE POLICY "Admins and moderators can manage logos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'site-assets' AND 
  (storage.foldername(name))[1] = 'logos' AND
  (
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  )
)
WITH CHECK (
  bucket_id = 'site-assets' AND 
  (storage.foldername(name))[1] = 'logos' AND
  (
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  )
);

-- Ensure public read for site-assets (should already be there but let's be sure)
DROP POLICY IF EXISTS "Public can view site assets" ON storage.objects;
CREATE POLICY "Public can view site assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'site-assets');

-- Grant storage permissions to authenticated users for site-assets
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
