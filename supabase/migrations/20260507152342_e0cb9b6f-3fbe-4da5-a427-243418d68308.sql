
CREATE TABLE IF NOT EXISTS public.cronograma_mirante (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL DEFAULT public.current_environment(),
  atividade_key text NOT NULL,
  datas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (environment, atividade_key)
);

ALTER TABLE public.cronograma_mirante ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view cronograma in env" ON public.cronograma_mirante
  FOR SELECT TO authenticated
  USING (public.has_environment_access(auth.uid(), environment));

CREATE POLICY "insert cronograma in env" ON public.cronograma_mirante
  FOR INSERT TO authenticated
  WITH CHECK (public.has_environment_access(auth.uid(), environment));

CREATE POLICY "update cronograma in env" ON public.cronograma_mirante
  FOR UPDATE TO authenticated
  USING (public.has_environment_access(auth.uid(), environment))
  WITH CHECK (public.has_environment_access(auth.uid(), environment));

CREATE POLICY "delete cronograma in env" ON public.cronograma_mirante
  FOR DELETE TO authenticated
  USING (public.has_environment_access(auth.uid(), environment));

CREATE TRIGGER set_cronograma_env BEFORE INSERT ON public.cronograma_mirante
  FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();

CREATE TRIGGER set_cronograma_updated_at BEFORE UPDATE ON public.cronograma_mirante
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
