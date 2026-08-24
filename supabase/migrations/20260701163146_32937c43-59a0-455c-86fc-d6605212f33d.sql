
-- ATAS
CREATE TABLE public.cipa_atas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  responsavel TEXT,
  participantes TEXT,
  assuntos TEXT,
  pendencias TEXT,
  observacoes TEXT,
  file_url TEXT,
  file_name TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cipa_atas TO authenticated;
GRANT ALL ON public.cipa_atas TO service_role;
ALTER TABLE public.cipa_atas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read cipa_atas" ON public.cipa_atas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write cipa_atas" ON public.cipa_atas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update cipa_atas" ON public.cipa_atas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete cipa_atas" ON public.cipa_atas FOR DELETE TO authenticated USING (true);

-- PRESIDENTE
CREATE TABLE public.cipa_president (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT,
  setor TEXT,
  mandato_inicio DATE,
  mandato_fim DATE,
  foto_url TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cipa_president TO authenticated;
GRANT ALL ON public.cipa_president TO service_role;
ALTER TABLE public.cipa_president ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all cipa_president" ON public.cipa_president FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RESPONSAVEIS
CREATE TABLE public.cipa_responsaveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  funcao TEXT,
  cargo TEXT,
  setor TEXT,
  telefone TEXT,
  email TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cipa_responsaveis TO authenticated;
GRANT ALL ON public.cipa_responsaveis TO service_role;
ALTER TABLE public.cipa_responsaveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all cipa_responsaveis" ON public.cipa_responsaveis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DDS IMPORTANTES
CREATE TABLE public.cipa_dds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  categoria TEXT,
  dds_date DATE,
  responsavel TEXT,
  descricao TEXT,
  file_url TEXT,
  file_name TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cipa_dds TO authenticated;
GRANT ALL ON public.cipa_dds TO service_role;
ALTER TABLE public.cipa_dds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all cipa_dds" ON public.cipa_dds FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.cipa_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cipa_atas_upd BEFORE UPDATE ON public.cipa_atas FOR EACH ROW EXECUTE FUNCTION public.cipa_touch_updated_at();
CREATE TRIGGER trg_cipa_president_upd BEFORE UPDATE ON public.cipa_president FOR EACH ROW EXECUTE FUNCTION public.cipa_touch_updated_at();
CREATE TRIGGER trg_cipa_responsaveis_upd BEFORE UPDATE ON public.cipa_responsaveis FOR EACH ROW EXECUTE FUNCTION public.cipa_touch_updated_at();
CREATE TRIGGER trg_cipa_dds_upd BEFORE UPDATE ON public.cipa_dds FOR EACH ROW EXECUTE FUNCTION public.cipa_touch_updated_at();
