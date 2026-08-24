-- Add missing UPDATE policy for security-files storage bucket
CREATE POLICY "Authenticated users can update security files storage"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'security-files' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'security-files' AND auth.uid() IS NOT NULL);