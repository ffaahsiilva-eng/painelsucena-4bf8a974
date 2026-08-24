CREATE POLICY "Admins and moderators can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-assets' AND 
  (storage.foldername(name))[1] = 'logos' AND
  is_admin_or_moderator(auth.uid())
);

CREATE POLICY "Admins and moderators can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-assets' AND 
  (storage.foldername(name))[1] = 'logos' AND
  is_admin_or_moderator(auth.uid())
);

CREATE POLICY "Admins and moderators can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-assets' AND 
  (storage.foldername(name))[1] = 'logos' AND
  is_admin_or_moderator(auth.uid())
);