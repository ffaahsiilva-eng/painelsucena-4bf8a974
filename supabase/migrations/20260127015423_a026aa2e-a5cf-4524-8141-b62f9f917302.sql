-- Drop the restrictive check constraint that only allows exact FAIXA values
ALTER TABLE public.daily_gabiao_reports DROP CONSTRAINT daily_gabiao_reports_local_servico_check;