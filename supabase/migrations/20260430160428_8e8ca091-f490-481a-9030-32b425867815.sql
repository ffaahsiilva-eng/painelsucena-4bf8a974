
-- Adiciona toggles e grupo para alerta de prazo de desvios
ALTER TABLE public.wapi_config
  ADD COLUMN IF NOT EXISTS auto_send_desvio_due_alert boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_id_desvio_due text;

-- Tabela de idempotência (para não enviar o mesmo alerta 2x no mesmo dia)
CREATE TABLE IF NOT EXISTS public.wapi_desvio_due_alerts_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  desvio_key text NOT NULL UNIQUE,
  due_date date NOT NULL,
  alert_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wapi_desvio_due_alerts_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage desvio due alerts sent"
  ON public.wapi_desvio_due_alerts_sent
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS wapi_desvio_due_alerts_sent_date_idx
  ON public.wapi_desvio_due_alerts_sent (due_date);
