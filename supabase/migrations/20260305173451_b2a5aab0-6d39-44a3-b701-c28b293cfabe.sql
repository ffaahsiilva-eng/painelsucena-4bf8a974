
CREATE TABLE public.abastecimento_caixa_dagua (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  semana INTEGER NOT NULL CHECK (semana >= 1 AND semana <= 4),
  kg NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (ano, mes, semana)
);

ALTER TABLE public.abastecimento_caixa_dagua ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read abastecimento_caixa_dagua"
  ON public.abastecimento_caixa_dagua
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert abastecimento_caixa_dagua"
  ON public.abastecimento_caixa_dagua
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update abastecimento_caixa_dagua"
  ON public.abastecimento_caixa_dagua
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete abastecimento_caixa_dagua"
  ON public.abastecimento_caixa_dagua
  FOR DELETE TO authenticated USING (true);
