
ALTER TABLE public.wapi_config
  ADD COLUMN IF NOT EXISTS auto_send_cronograma_mirante boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_id_cronograma_mirante text;

CREATE TABLE IF NOT EXISTS public.wapi_cronograma_mirante_alerts_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key text NOT NULL UNIQUE,
  atividade_key text NOT NULL,
  scheduled_date date NOT NULL,
  alert_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wapi_cronograma_mirante_alerts_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cronograma mirante alerts"
  ON public.wapi_cronograma_mirante_alerts_sent
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages cronograma mirante alerts"
  ON public.wapi_cronograma_mirante_alerts_sent
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
