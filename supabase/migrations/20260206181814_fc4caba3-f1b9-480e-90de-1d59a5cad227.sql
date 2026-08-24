
-- Add sidebar_font column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sidebar_font text DEFAULT null;
