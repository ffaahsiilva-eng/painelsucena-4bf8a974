
CREATE TABLE public.pluviometria_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setor TEXT NOT NULL DEFAULT 'campo',
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  dia INTEGER NOT NULL,
  mm NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setor, ano, mes, dia)
);

ALTER TABLE public.pluviometria_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pluviometria" ON public.pluviometria_records FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert pluviometria" ON public.pluviometria_records FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update pluviometria" ON public.pluviometria_records FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete pluviometria" ON public.pluviometria_records FOR DELETE USING (is_admin(auth.uid()));
