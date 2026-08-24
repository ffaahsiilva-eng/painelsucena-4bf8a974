
CREATE TABLE public.pos_chuva_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  empresa TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  projeto TEXT,
  responsavel TEXT,
  local_inspecao TEXT,
  atividade TEXT,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  plano_acao JSONB NOT NULL DEFAULT '[]'::jsonb,
  avaliacao_1_data TEXT,
  avaliacao_1_horario TEXT,
  avaliacao_1_sig_encarregado TEXT,
  avaliacao_1_sig_tecnico TEXT,
  avaliacao_2_data TEXT,
  avaliacao_2_horario TEXT,
  avaliacao_2_sig_encarregado TEXT,
  avaliacao_2_sig_tecnico TEXT,
  avaliacao_3_data TEXT,
  avaliacao_3_horario TEXT,
  avaliacao_3_sig_encarregado TEXT,
  avaliacao_3_sig_tecnico TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_chuva_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pos_chuva" ON public.pos_chuva_inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pos_chuva" ON public.pos_chuva_inspections FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update pos_chuva" ON public.pos_chuva_inspections FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE TRIGGER update_pos_chuva_updated_at BEFORE UPDATE ON public.pos_chuva_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
