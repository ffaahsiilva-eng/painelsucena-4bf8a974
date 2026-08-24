GRANT SELECT ON public.site_settings TO anon;

CREATE POLICY "Anon can view site settings"
ON public.site_settings
FOR SELECT
TO anon
USING (true);