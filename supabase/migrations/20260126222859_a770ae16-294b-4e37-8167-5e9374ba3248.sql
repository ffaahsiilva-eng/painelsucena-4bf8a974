-- Add gabiao goal columns to goals table
ALTER TABLE public.goals
ADD COLUMN limpeza_canaleta_m numeric NOT NULL DEFAULT 0,
ADD COLUMN recomposicao_gabiao_m numeric NOT NULL DEFAULT 0,
ADD COLUMN manutencao_drenagem_m numeric NOT NULL DEFAULT 0,
ADD COLUMN limpeza_bueiro_unidade integer NOT NULL DEFAULT 0,
ADD COLUMN reparo_cerca_m numeric NOT NULL DEFAULT 0;