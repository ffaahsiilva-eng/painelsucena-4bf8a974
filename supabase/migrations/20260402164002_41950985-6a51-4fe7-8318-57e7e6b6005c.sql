ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS instacena_gif_opacity double precision DEFAULT 1,
  ADD COLUMN IF NOT EXISTS instacena_gif_right_opacity double precision DEFAULT 1;