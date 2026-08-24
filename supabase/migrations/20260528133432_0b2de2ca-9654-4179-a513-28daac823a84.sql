ALTER TABLE public.daily_jardinagem_reports
  ADD COLUMN IF NOT EXISTS cova_unidade integer,
  ADD COLUMN IF NOT EXISTS cova_berma integer,
  ADD COLUMN IF NOT EXISTS cova_faixa text;