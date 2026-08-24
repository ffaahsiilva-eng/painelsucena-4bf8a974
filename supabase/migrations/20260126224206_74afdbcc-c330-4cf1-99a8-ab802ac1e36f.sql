-- Remove old columns and add new ones for Gabião goals
ALTER TABLE public.goals 
DROP COLUMN IF EXISTS reparo_cerca_m,
DROP COLUMN IF EXISTS limpeza_bueiro_unidade;

-- Add new Gabião goal columns matching Atividades II activities
ALTER TABLE public.goals 
ADD COLUMN escavacao_manual_unidade integer NOT NULL DEFAULT 0,
ADD COLUMN reposicao_manta_unidade integer NOT NULL DEFAULT 0,
ADD COLUMN reposicao_silte_unidade integer NOT NULL DEFAULT 0;