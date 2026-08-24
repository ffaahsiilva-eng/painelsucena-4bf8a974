CREATE TABLE public.cronograma_mirante_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment text NOT NULL DEFAULT public.current_environment(),
  atividade_key text NOT NULL,
  datas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ciclo_label text,
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronograma_mirante_historico TO authenticated;
GRANT ALL ON public.cronograma_mirante_historico TO service_role;

ALTER TABLE public.cronograma_mirante_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver historico do cronograma"
ON public.cronograma_mirante_historico FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados podem inserir historico do cronograma"
ON public.cronograma_mirante_historico FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admin ou moderador pode remover historico do cronograma"
ON public.cronograma_mirante_historico FOR DELETE TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

CREATE INDEX idx_cron_mirante_hist_env ON public.cronograma_mirante_historico (environment, archived_at DESC);

CREATE TRIGGER trg_cron_mirante_hist_updated_at
BEFORE UPDATE ON public.cronograma_mirante_historico
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();