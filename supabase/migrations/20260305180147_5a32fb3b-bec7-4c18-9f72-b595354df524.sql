
-- Table for residuos (waste) tracking
CREATE TABLE public.residuos_efluentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  tipo TEXT NOT NULL,
  kg NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ano, mes, tipo)
);

ALTER TABLE public.residuos_efluentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view residuos" ON public.residuos_efluentes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert residuos" ON public.residuos_efluentes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update residuos" ON public.residuos_efluentes
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete residuos" ON public.residuos_efluentes
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
