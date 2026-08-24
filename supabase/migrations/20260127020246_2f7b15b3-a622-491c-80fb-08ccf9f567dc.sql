-- Add columns to store formatted workforce text for each area
ALTER TABLE public.rdo_reports 
ADD COLUMN IF NOT EXISTS efetivo_gabiao_text TEXT,
ADD COLUMN IF NOT EXISTS efetivo_jardinagem_text TEXT;