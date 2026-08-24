-- Add adubagem columns to daily_jardinagem_reports table
ALTER TABLE public.daily_jardinagem_reports 
ADD COLUMN adubagem_unidade integer DEFAULT 0,
ADD COLUMN adubagem_berma integer DEFAULT NULL;