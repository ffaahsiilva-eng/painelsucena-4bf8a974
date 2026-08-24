-- Adiciona a coluna report_date para permitir múltiplos registros por ambiente
ALTER TABLE public.aspersores_annotations ADD COLUMN IF NOT EXISTS report_date DATE;

-- Cria um índice único para garantir um relatório por ambiente por dia (mantendo o page=1 ou similar se necessário, mas aqui usaremos para o novo layout)
CREATE UNIQUE INDEX IF NOT EXISTS aspersores_annotations_env_date_idx ON public.aspersores_annotations (environment, report_date) WHERE report_date IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aspersores_annotations TO authenticated;
GRANT ALL ON public.aspersores_annotations TO service_role;
