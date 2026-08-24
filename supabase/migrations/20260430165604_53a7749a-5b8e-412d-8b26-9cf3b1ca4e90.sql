ALTER TABLE public.pos_chuva_inspections
  ADD COLUMN IF NOT EXISTS chuva_inicio text,
  ADD COLUMN IF NOT EXISTS chuva_fim text;