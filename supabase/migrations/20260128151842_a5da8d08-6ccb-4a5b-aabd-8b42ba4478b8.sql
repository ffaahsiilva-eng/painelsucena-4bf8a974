-- Add photo_urls column to daily_jardinagem_reports
ALTER TABLE public.daily_jardinagem_reports 
ADD COLUMN photo_urls text[] DEFAULT '{}';

-- Add photo_urls column to daily_gabiao_reports
ALTER TABLE public.daily_gabiao_reports 
ADD COLUMN photo_urls text[] DEFAULT '{}';