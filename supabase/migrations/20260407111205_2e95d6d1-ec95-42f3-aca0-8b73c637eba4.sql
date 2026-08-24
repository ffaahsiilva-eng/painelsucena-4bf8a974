CREATE TABLE public.material_requisitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data TEXT NOT NULL DEFAULT CURRENT_DATE::TEXT,
  autorizado_por TEXT NOT NULL,
  matricula_autorizador TEXT,
  motivo TEXT NOT NULL,
  funcionario_nome TEXT NOT NULL,
  funcionario_funcao TEXT,
  funcionario_matricula TEXT,
  materiais JSONB NOT NULL DEFAULT '[]'::JSONB,
  area_destino TEXT NOT NULL,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  assinatura_funcionario TEXT,
  assinatura_autorizador TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.material_requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all material requisitions"
ON public.material_requisitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create material requisitions"
ON public.material_requisitions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their own material requisitions"
ON public.material_requisitions FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete their own material requisitions"
ON public.material_requisitions FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TRIGGER update_material_requisitions_updated_at
BEFORE UPDATE ON public.material_requisitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();