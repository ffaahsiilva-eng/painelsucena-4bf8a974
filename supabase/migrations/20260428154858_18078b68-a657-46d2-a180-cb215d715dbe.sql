ALTER TABLE public.wapi_config ADD COLUMN IF NOT EXISTS auto_send_vehicle_inspection_alert boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.wapi_vehicle_alerts_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key text NOT NULL UNIQUE,
  placa text NOT NULL,
  field_key text NOT NULL,
  expiry_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wapi_vehicle_alerts_sent_key ON public.wapi_vehicle_alerts_sent(alert_key);

ALTER TABLE public.wapi_vehicle_alerts_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage vehicle alerts sent" ON public.wapi_vehicle_alerts_sent;
CREATE POLICY "Admins manage vehicle alerts sent"
ON public.wapi_vehicle_alerts_sent
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));