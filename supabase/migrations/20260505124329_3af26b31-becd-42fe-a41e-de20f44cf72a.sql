-- Add environment column to site_settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS environment TEXT;

-- Update existing record to 'barcarena'
UPDATE public.site_settings SET environment = 'barcarena' WHERE environment IS NULL;

-- Add unique constraint to environment
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_environment_key UNIQUE (environment);

-- Ensure RLS is enabled (it should be, but just in case)
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- If there are existing policies, they might need update or we add one for reading
-- Simple policy for now: anyone authenticated can read
DROP POLICY IF EXISTS "Site settings are viewable by everyone" ON public.site_settings;
CREATE POLICY "Site settings are viewable by everyone" 
ON public.site_settings 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Only admins can update site settings" ON public.site_settings;
CREATE POLICY "Only admins can update site settings" 
ON public.site_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  )
);
