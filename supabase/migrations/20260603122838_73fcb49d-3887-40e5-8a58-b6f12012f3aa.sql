-- Add transition_logo_url column to site_settings table
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS transition_logo_url TEXT;

-- Update the existing settings to ensure it can be updated
-- (Already handled by the application logic but good to have the column available)
