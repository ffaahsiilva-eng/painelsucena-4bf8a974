-- Add irrigation columns to daily_jardinagem_reports
ALTER TABLE public.daily_jardinagem_reports
ADD COLUMN irrigacao_pipas boolean DEFAULT false,
ADD COLUMN irrigacao_carretel boolean DEFAULT false,
ADD COLUMN irrigacao_carretel_bermas integer[] DEFAULT '{}'::integer[];