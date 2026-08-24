ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS screensaver_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS screensaver_timeout INTEGER DEFAULT 5;