ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS login_particles_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS login_particles_color TEXT DEFAULT 'white',
ADD COLUMN IF NOT EXISTS login_particles_count INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS login_particles_speed FLOAT DEFAULT 1.0;