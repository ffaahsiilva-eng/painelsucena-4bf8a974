ALTER TABLE public.site_settings 
  ADD COLUMN instacena_gif_right_url text DEFAULT NULL,
  ADD COLUMN instacena_gif_right_position jsonb DEFAULT '{"x": 1000, "y": 80}'::jsonb,
  ADD COLUMN instacena_gif_right_size integer DEFAULT 200,
  ADD COLUMN instacena_gif_right_height integer DEFAULT NULL;