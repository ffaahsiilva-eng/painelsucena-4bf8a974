
CREATE TABLE public.epi_exchanges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  autorizado_por TEXT NOT NULL,
  matricula_autorizador TEXT,
  motivo_troca TEXT NOT NULL,
  funcionario_nome TEXT NOT NULL,
  funcionario_funcao TEXT,
  funcionario_matricula TEXT,
  epis JSONB NOT NULL DEFAULT '[]'::jsonb,
  uniforme_blusa_tamanho TEXT,
  uniforme_blusa_quantidade INTEGER DEFAULT 0,
  uniforme_calca_tamanho TEXT,
  uniforme_calca_quantidade INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.epi_exchanges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view epi exchanges"
  ON public.epi_exchanges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert epi exchanges"
  ON public.epi_exchanges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator or admin can update epi exchanges"
  ON public.epi_exchanges FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by OR is_admin(auth.uid()));

CREATE POLICY "Creator or admin can delete epi exchanges"
  ON public.epi_exchanges FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR is_admin(auth.uid()));
