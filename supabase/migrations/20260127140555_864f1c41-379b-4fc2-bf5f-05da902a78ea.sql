-- Add new goal columns for recomposição activities
ALTER TABLE public.goals
ADD COLUMN recomposicao_tela_unidade integer NOT NULL DEFAULT 0,
ADD COLUMN recomposicao_cascalho_unidade integer NOT NULL DEFAULT 0,
ADD COLUMN recomposicao_silte_unidade integer NOT NULL DEFAULT 0;