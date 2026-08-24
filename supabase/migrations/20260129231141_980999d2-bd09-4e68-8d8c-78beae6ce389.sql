-- Add new columns for plantio de grama and atividades manuais to daily_jardinagem_reports
ALTER TABLE public.daily_jardinagem_reports 
ADD COLUMN IF NOT EXISTS plantio_grama_m2 numeric,
ADD COLUMN IF NOT EXISTS plantio_grama_faixa text,
ADD COLUMN IF NOT EXISTS plantio_grama_berma integer,
ADD COLUMN IF NOT EXISTS atividades_manuais text;