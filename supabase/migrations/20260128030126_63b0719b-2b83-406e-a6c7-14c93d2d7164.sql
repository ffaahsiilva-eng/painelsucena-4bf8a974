-- Add nav_order column to user_preferences table for personal navigation order
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS nav_order jsonb DEFAULT NULL;