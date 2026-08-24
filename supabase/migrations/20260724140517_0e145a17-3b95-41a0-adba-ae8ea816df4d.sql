
CREATE TABLE public.irrigacao_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL,
  nome TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'un',
  quantidade NUMERIC NOT NULL DEFAULT 0,
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.irrigacao_itens TO authenticated;
GRANT ALL ON public.irrigacao_itens TO service_role;
ALTER TABLE public.irrigacao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read irrigacao_itens" ON public.irrigacao_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert irrigacao_itens" ON public.irrigacao_itens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update irrigacao_itens" ON public.irrigacao_itens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin delete irrigacao_itens" ON public.irrigacao_itens FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_irrigacao_itens_env ON public.irrigacao_itens(environment);

CREATE TABLE public.irrigacao_movimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES public.irrigacao_itens(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  quantidade NUMERIC NOT NULL,
  motivo TEXT,
  registrado_por_id UUID,
  registrado_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.irrigacao_movimentos TO authenticated;
GRANT ALL ON public.irrigacao_movimentos TO service_role;
ALTER TABLE public.irrigacao_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read irrigacao_mov" ON public.irrigacao_movimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert irrigacao_mov" ON public.irrigacao_movimentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin delete irrigacao_mov" ON public.irrigacao_movimentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_irrigacao_mov_env ON public.irrigacao_movimentos(environment);
CREATE INDEX idx_irrigacao_mov_item ON public.irrigacao_movimentos(item_id);

CREATE TRIGGER trg_irrigacao_itens_updated
BEFORE UPDATE ON public.irrigacao_itens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
