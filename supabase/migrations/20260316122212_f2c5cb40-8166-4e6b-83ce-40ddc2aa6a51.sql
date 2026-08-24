
CREATE TABLE public.mudas_para_plantar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  especie TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  faixa TEXT,
  berma INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mudas_para_plantar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view mudas_para_plantar"
  ON public.mudas_para_plantar FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert mudas_para_plantar"
  ON public.mudas_para_plantar FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can delete own mudas_para_plantar"
  ON public.mudas_para_plantar FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
