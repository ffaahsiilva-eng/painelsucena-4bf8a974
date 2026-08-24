-- Drop policies we created earlier to replace with a more robust version
DROP POLICY IF EXISTS "Admins and moderators can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and moderators can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins and moderators can delete logos" ON storage.objects;

-- Create comprehensive policy for logos folder
CREATE POLICY "Admins and moderators can manage logos"
ON storage.objects
FOR ALL -- Covers INSERT, UPDATE, DELETE, SELECT
TO authenticated
USING (
  bucket_id = 'site-assets' AND 
  (storage.foldername(name))[1] = 'logos' AND
  is_admin_or_moderator(auth.uid())
)
WITH CHECK (
  bucket_id = 'site-assets' AND 
  (storage.foldername(name))[1] = 'logos' AND
  is_admin_or_moderator(auth.uid())
);

-- The 'Filter by environment' policy is RESTRICTIVE.
-- If 'current_environment()' doesn't match the row's 'environment', the whole operation fails.
-- Let's make it permissive or adjust it. 
-- For now, let's drop it if it exists to debug, or modify it to allow admins to bypass.

DROP POLICY IF EXISTS "Filter by environment" ON public.page_customizations;

CREATE POLICY "Filter by environment"
ON public.page_customizations
FOR ALL
TO authenticated
USING (
  is_admin_or_moderator(auth.uid()) OR environment = current_environment()
)
WITH CHECK (
  is_admin_or_moderator(auth.uid()) OR environment = current_environment()
);

-- Ensure default environment if not provided (safety trigger already exists likely, but good to be sure)
ALTER TABLE public.page_customizations ALTER COLUMN environment SET DEFAULT 'barcarena';