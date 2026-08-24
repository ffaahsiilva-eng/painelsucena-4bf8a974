ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS weather_sunny_media_url text,
  ADD COLUMN IF NOT EXISTS weather_rainy_media_url text,
  ADD COLUMN IF NOT EXISTS weather_cold_media_url text;