ALTER TABLE public.site_settings 
  ADD COLUMN instacena_gif_size integer DEFAULT 200,
  ADD COLUMN instacena_gif_url text DEFAULT NULL;