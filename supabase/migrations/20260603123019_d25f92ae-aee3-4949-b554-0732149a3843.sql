-- Add color2 and color3 columns to site_settings table
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS login_particles_color2 TEXT,
ADD COLUMN IF NOT EXISTS login_particles_color3 TEXT;
