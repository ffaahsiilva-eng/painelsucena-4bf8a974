
-- Add sidebar customization columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sidebar_color text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sidebar_animation text;
