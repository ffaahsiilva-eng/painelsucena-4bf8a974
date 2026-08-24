-- Add missing activity columns to goals table
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS limpeza_manual_m2 numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS limpeza_assoprador_m2 numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS limpeza_bueiro_unidade integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reparo_cerca_m numeric NOT NULL DEFAULT 0;