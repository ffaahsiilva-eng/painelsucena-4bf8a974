
CREATE TABLE IF NOT EXISTS public.wapi_training_alerts_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key text NOT NULL UNIQUE,
  training_id uuid,
  expiry_date date,
  alert_type text, -- '10d' | '0d'
  sent_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wapi_training_alerts_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read training alerts" ON public.wapi_training_alerts_sent
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_wapi_train_sent_key ON public.wapi_training_alerts_sent(alert_key);
