-- Add photo_url column to dds_schedule for daily photos
ALTER TABLE public.dds_schedule 
ADD COLUMN photo_url TEXT NULL;