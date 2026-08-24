-- Add new columns for invasive species control and seedling removal
ALTER TABLE public.daily_jardinagem_reports
ADD COLUMN controle_invasoras_unidade integer DEFAULT 0,
ADD COLUMN controle_invasoras_nome text,
ADD COLUMN retirada_mudas_unidade integer DEFAULT 0;