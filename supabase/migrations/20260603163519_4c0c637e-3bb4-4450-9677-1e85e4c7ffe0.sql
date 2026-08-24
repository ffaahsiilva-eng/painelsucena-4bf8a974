ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS global_background_url TEXT,
ADD COLUMN IF NOT EXISTS global_background_opacity NUMERIC DEFAULT 0.1;

COMMENT ON COLUMN public.site_settings.global_background_url IS 'URL for the background image displayed on all pages.';
COMMENT ON COLUMN public.site_settings.global_background_opacity IS 'Opacity level (0-1) for the global background image.';