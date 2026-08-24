ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS weather_day_sunny_media_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS weather_day_rainy_media_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS weather_day_cold_media_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS weather_night_hot_media_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS weather_night_cold_media_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS weather_night_rainy_media_urls text[] NOT NULL DEFAULT '{}';

-- Migra valores antigos (single URL) para os novos arrays como "Dia"
UPDATE public.site_settings
SET weather_day_sunny_media_urls = CASE WHEN weather_sunny_media_url IS NOT NULL AND weather_sunny_media_url <> '' AND COALESCE(array_length(weather_day_sunny_media_urls,1),0)=0 THEN ARRAY[weather_sunny_media_url] ELSE weather_day_sunny_media_urls END,
    weather_day_rainy_media_urls = CASE WHEN weather_rainy_media_url IS NOT NULL AND weather_rainy_media_url <> '' AND COALESCE(array_length(weather_day_rainy_media_urls,1),0)=0 THEN ARRAY[weather_rainy_media_url] ELSE weather_day_rainy_media_urls END,
    weather_day_cold_media_urls  = CASE WHEN weather_cold_media_url  IS NOT NULL AND weather_cold_media_url  <> '' AND COALESCE(array_length(weather_day_cold_media_urls,1),0)=0  THEN ARRAY[weather_cold_media_url]  ELSE weather_day_cold_media_urls  END;