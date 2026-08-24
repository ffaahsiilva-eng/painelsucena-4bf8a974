
-- ============================================================
-- 1) Fila de idempotência para ações críticas do motorista
-- ============================================================
CREATE TABLE IF NOT EXISTS public.driver_action_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_action_id uuid NOT NULL UNIQUE,
  driver_id uuid,
  equipment_id uuid,
  action text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending | committed | failed
  error text,
  is_online boolean,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daq_driver_created
  ON public.driver_action_queue(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daq_equipment_created
  ON public.driver_action_queue(equipment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daq_status
  ON public.driver_action_queue(status) WHERE status <> 'committed';

GRANT SELECT, INSERT, UPDATE ON public.driver_action_queue TO authenticated;
GRANT ALL ON public.driver_action_queue TO service_role;

ALTER TABLE public.driver_action_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver inserts own action"
  ON public.driver_action_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = auth.uid() OR driver_id IS NULL);

CREATE POLICY "driver updates own action"
  ON public.driver_action_queue
  FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "driver reads own action"
  ON public.driver_action_queue
  FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at_daq()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_daq_updated_at ON public.driver_action_queue;
CREATE TRIGGER trg_daq_updated_at
  BEFORE UPDATE ON public.driver_action_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_daq();

-- ============================================================
-- 2) Auditoria de login do motorista
-- ============================================================
CREATE TABLE IF NOT EXISTS public.driver_login_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  success boolean NOT NULL,
  error_code text,
  error_message text,
  duration_ms integer,
  user_agent text,
  is_online boolean,
  screen text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dla_user_created
  ON public.driver_login_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dla_success_created
  ON public.driver_login_audit(success, created_at DESC);

GRANT SELECT, INSERT ON public.driver_login_audit TO authenticated;
GRANT INSERT ON public.driver_login_audit TO anon; -- inserts before session exists on login attempt
GRANT ALL ON public.driver_login_audit TO service_role;

ALTER TABLE public.driver_login_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log login attempt"
  ON public.driver_login_audit
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admin reads login audit"
  ON public.driver_login_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
