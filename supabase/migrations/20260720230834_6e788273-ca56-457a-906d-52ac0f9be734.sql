
-- 1) Environments table
CREATE TABLE IF NOT EXISTS public.environments (
  id text PRIMARY KEY,
  label text NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.environments TO authenticated;
GRANT ALL ON public.environments TO service_role;

ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "environments_select_authenticated" ON public.environments;
CREATE POLICY "environments_select_authenticated" ON public.environments
  FOR SELECT TO authenticated USING (true);

-- Seed built-in envs
INSERT INTO public.environments (id, label, description)
VALUES 
  ('barcarena', 'Barcarena - Alunorte', 'Ambiente principal e existente do sistema.'),
  ('paragominas', 'Paragominas', 'Nova operação — mesma estrutura, dados independentes.')
ON CONFLICT (id) DO NOTHING;

-- 2) RPC to create environment and clone system settings + grant admins access
CREATE OR REPLACE FUNCTION public.create_environment(_id text, _label text, _description text DEFAULT NULL)
RETURNS public.environments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _new_env public.environments;
  _clean_id text;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF NOT public.is_admin_or_moderator(_caller) THEN
    RAISE EXCEPTION 'Apenas admin ou moderador pode criar ambientes';
  END IF;

  _clean_id := lower(regexp_replace(coalesce(_id, ''), '[^a-z0-9_-]+', '-', 'g'));
  IF _clean_id IS NULL OR length(_clean_id) < 2 THEN
    RAISE EXCEPTION 'ID de ambiente inválido';
  END IF;

  IF EXISTS (SELECT 1 FROM public.environments WHERE id = _clean_id) THEN
    RAISE EXCEPTION 'Ambiente já existe';
  END IF;

  INSERT INTO public.environments (id, label, description, created_by)
  VALUES (_clean_id, coalesce(nullif(trim(_label), ''), _clean_id), _description, _caller)
  RETURNING * INTO _new_env;

  -- Clona configurações do sistema do ambiente Barcarena para o novo ambiente
  INSERT INTO public.site_settings (
    logo_url, sidebar_color, nav_order, show_signup_button, ui_theme, primary_color,
    instacena_gif_position, instacena_gif_size, instacena_gif_url, instacena_gif_height,
    instacena_gif_right_url, instacena_gif_right_position, instacena_gif_right_size,
    instacena_gif_right_height, instacena_gif_opacity, instacena_gif_right_opacity,
    sidebar_animation, sidebar_font, sidebar_font_color, sidebar_active_color,
    sidebar_active_font_color, screensaver_enabled, screensaver_timeout, environment,
    login_background_url, login_particles_enabled, login_particles_color, login_particles_count,
    login_particles_speed, transition_logo_url, login_particles_color2, login_particles_color3,
    page_loading_img_url, global_background_url, global_background_opacity,
    sync_login_bg_to_sidebar, weather_sunny_media_url, weather_rainy_media_url,
    weather_cold_media_url, weather_day_sunny_media_urls, weather_day_rainy_media_urls,
    weather_day_cold_media_urls, weather_night_hot_media_urls, weather_night_cold_media_urls,
    weather_night_rainy_media_urls, card_opacity, custom_attendance_area_label
  )
  SELECT
    logo_url, sidebar_color, nav_order, show_signup_button, ui_theme, primary_color,
    instacena_gif_position, instacena_gif_size, instacena_gif_url, instacena_gif_height,
    instacena_gif_right_url, instacena_gif_right_position, instacena_gif_right_size,
    instacena_gif_right_height, instacena_gif_opacity, instacena_gif_right_opacity,
    sidebar_animation, sidebar_font, sidebar_font_color, sidebar_active_color,
    sidebar_active_font_color, screensaver_enabled, screensaver_timeout, _clean_id,
    login_background_url, login_particles_enabled, login_particles_color, login_particles_count,
    login_particles_speed, transition_logo_url, login_particles_color2, login_particles_color3,
    page_loading_img_url, global_background_url, global_background_opacity,
    sync_login_bg_to_sidebar, weather_sunny_media_url, weather_rainy_media_url,
    weather_cold_media_url, weather_day_sunny_media_urls, weather_day_rainy_media_urls,
    weather_day_cold_media_urls, weather_night_hot_media_urls, weather_night_cold_media_urls,
    weather_night_rainy_media_urls, card_opacity, custom_attendance_area_label
  FROM public.site_settings
  WHERE environment = 'barcarena'
  LIMIT 1;

  -- Concede acesso ao novo ambiente para todos os admins existentes
  INSERT INTO public.user_environment_access (user_id, environment, granted_by)
  SELECT ur.user_id, _clean_id, _caller
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
  ON CONFLICT (user_id, environment) DO NOTHING;

  -- Garante que o criador (mesmo se moderador) tenha acesso
  INSERT INTO public.user_environment_access (user_id, environment, granted_by)
  VALUES (_caller, _clean_id, _caller)
  ON CONFLICT (user_id, environment) DO NOTHING;

  RETURN _new_env;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_environment(text, text, text) TO authenticated;
