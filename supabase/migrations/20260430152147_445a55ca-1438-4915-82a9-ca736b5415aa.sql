
-- Tabela de Controle de Treinamentos NR
CREATE TABLE public.nr_trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matricula TEXT,
  status TEXT NOT NULL DEFAULT 'Ativo',
  collaborator_name TEXT NOT NULL,
  role TEXT,
  area TEXT,
  training TEXT NOT NULL, -- 'NR20' | 'NR35'
  training_date DATE,
  validity_days INTEGER DEFAULT 730,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (collaborator_name, training)
);

ALTER TABLE public.nr_trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read nr_trainings"
  ON public.nr_trainings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert nr_trainings"
  ON public.nr_trainings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update nr_trainings"
  ON public.nr_trainings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admin/moderator delete nr_trainings"
  ON public.nr_trainings FOR DELETE TO authenticated
  USING (public.is_admin_or_moderator(auth.uid()));

CREATE TRIGGER nr_trainings_updated_at
  BEFORE UPDATE ON public.nr_trainings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_nr_trainings_name ON public.nr_trainings (collaborator_name);
CREATE INDEX idx_nr_trainings_training ON public.nr_trainings (training);
