ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sidebar_font_color text DEFAULT null;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sidebar_active_color text DEFAULT null;