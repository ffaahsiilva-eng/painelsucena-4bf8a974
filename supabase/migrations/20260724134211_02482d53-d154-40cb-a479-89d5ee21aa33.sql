
CREATE TABLE public.aspersores_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL,
  page INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (environment, page)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aspersores_annotations TO authenticated;
GRANT ALL ON public.aspersores_annotations TO service_role;

ALTER TABLE public.aspersores_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read annotations"
  ON public.aspersores_annotations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert annotations"
  ON public.aspersores_annotations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update annotations"
  ON public.aspersores_annotations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete annotations"
  ON public.aspersores_annotations FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
