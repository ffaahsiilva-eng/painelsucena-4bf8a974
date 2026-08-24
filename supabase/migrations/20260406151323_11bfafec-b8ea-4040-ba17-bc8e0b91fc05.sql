CREATE TABLE public.dds_participation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dds_date DATE NOT NULL,
  employee_name TEXT NOT NULL,
  present BOOLEAN NOT NULL DEFAULT false,
  saved_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dds_date, employee_name)
);

ALTER TABLE public.dds_participation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view dds participation"
  ON public.dds_participation FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert dds participation"
  ON public.dds_participation FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update dds participation"
  ON public.dds_participation FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete dds participation"
  ON public.dds_participation FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_dds_participation_updated_at
  BEFORE UPDATE ON public.dds_participation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();