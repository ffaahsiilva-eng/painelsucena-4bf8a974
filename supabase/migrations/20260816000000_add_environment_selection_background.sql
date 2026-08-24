-- Add environment_selection_background_url column to site_settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS environment_selection_background_url TEXT;

-- Update RLS grants to ensure it's accessible (usually already done for the table, but good practice)
GRANT ALL ON public.site_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
