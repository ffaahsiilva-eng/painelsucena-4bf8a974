ALTER TABLE public.wapi_config ADD COLUMN IF NOT EXISTS auto_send_aso_alert boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.wapi_aso_alerts_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_key text NOT NULL,
  expiry_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (colaborador_key, expiry_date)
);

ALTER TABLE public.wapi_aso_alerts_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view aso alerts"
  ON public.wapi_aso_alerts_sent
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));