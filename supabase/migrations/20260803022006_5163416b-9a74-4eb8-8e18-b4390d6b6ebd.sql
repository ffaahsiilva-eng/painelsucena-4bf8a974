ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS login_anim_logo_duration_ms integer NOT NULL DEFAULT 1400,
  ADD COLUMN IF NOT EXISTS login_anim_name_duration_ms integer NOT NULL DEFAULT 1100,
  ADD COLUMN IF NOT EXISTS login_anim_intensity integer NOT NULL DEFAULT 100;