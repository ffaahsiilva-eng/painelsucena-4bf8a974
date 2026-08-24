-- Allow anyone to view site settings (public read access)
DROP POLICY IF EXISTS "Authenticated users can view site settings" ON public.site_settings;
CREATE POLICY "Anyone can view site settings" 
ON public.site_settings 
FOR SELECT 
USING (true);