-- Allow admins and moderators full access to site-assets bucket
DROP POLICY IF EXISTS "Admins and moderators can manage site assets" ON storage.objects;
CREATE POLICY "Admins and moderators can manage site assets"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'site-assets' AND
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
  (
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  )
);

-- Ensure public can still read
DROP POLICY IF EXISTS "Anyone can view site assets" ON storage.objects;
CREATE POLICY "Anyone can view site assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'site-assets');
