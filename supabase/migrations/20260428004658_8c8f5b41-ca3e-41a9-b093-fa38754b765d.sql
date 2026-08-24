
CREATE TABLE public.wapi_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_url text NOT NULL DEFAULT '',
  instance_token text NOT NULL DEFAULT '',
  instance_id text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wapi_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view wapi_config" ON public.wapi_config
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert wapi_config" ON public.wapi_config
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update wapi_config" ON public.wapi_config
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete wapi_config" ON public.wapi_config
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_wapi_config_updated
  BEFORE UPDATE ON public.wapi_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.wapi_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid,
  recipient_user_id uuid,
  recipient_name text,
  recipient_phone text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wapi_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view wapi logs" ON public.wapi_message_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert wapi logs" ON public.wapi_message_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_wapi_logs_created ON public.wapi_message_logs(created_at DESC);
