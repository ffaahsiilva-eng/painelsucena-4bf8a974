
CREATE TABLE public.driver_vehicle_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL,
  equipment_name text NOT NULL,
  plate text NOT NULL,
  driver_name text,
  problem_description text NOT NULL,
  created_by uuid,
  environment text NOT NULL DEFAULT 'barcarena',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_driver_vehicle_checklists_equipment ON public.driver_vehicle_checklists(equipment_id, created_at DESC);
CREATE INDEX idx_driver_vehicle_checklists_env ON public.driver_vehicle_checklists(environment);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_vehicle_checklists TO authenticated;
GRANT ALL ON public.driver_vehicle_checklists TO service_role;

ALTER TABLE public.driver_vehicle_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view checklists" ON public.driver_vehicle_checklists
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert checklists" ON public.driver_vehicle_checklists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin can delete checklists" ON public.driver_vehicle_checklists
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Filter by environment" ON public.driver_vehicle_checklists
  AS RESTRICTIVE TO anon, authenticated
  USING (environment = current_environment())
  WITH CHECK (environment = current_environment());

CREATE TRIGGER set_environment_trigger
  BEFORE INSERT ON public.driver_vehicle_checklists
  FOR EACH ROW EXECUTE FUNCTION set_environment_on_insert();

-- Notify WhatsApp on insert
CREATE OR REPLACE FUNCTION public.notify_driver_vehicle_checklist_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cfg RECORD;
  _target_group text;
  _date_br text;
  _time_br text;
  _msg text;
  _para_time timestamptz;
BEGIN
  SELECT enabled, group_id_driver_status, group_id, instance_url, instance_token, instance_id
  INTO _cfg
  FROM public.wapi_config
  LIMIT 1;

  IF _cfg IS NULL OR _cfg.enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  _target_group := COALESCE(NULLIF(trim(_cfg.group_id_driver_status), ''), NULLIF(trim(_cfg.group_id), ''));
  IF _target_group IS NULL OR _cfg.instance_url IS NULL OR _cfg.instance_token IS NULL OR _cfg.instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  _para_time := NEW.created_at - interval '3 hours';
  _date_br := to_char(_para_time, 'DD/MM/YYYY');
  _time_br := to_char(_para_time, 'HH24:MI');

  _msg := '📋 *CHECK LIST - PROBLEMA NO VEÍCULO*' || E'\n' ||
          '━━━━━━━━━━━━━━━━━━━━' || E'\n\n' ||
          '*Equipamento:* ' || COALESCE(NEW.equipment_name, '—') || E'\n' ||
          '*Placa/ID:* ' || COALESCE(NEW.plate, '—') || E'\n' ||
          '*Data:* ' || _date_br || E'\n' ||
          '*Horário:* ' || _time_br || E'\n' ||
          '*Motorista:* ' || COALESCE(NULLIF(trim(NEW.driver_name), ''), '—') || E'\n\n' ||
          '*Problema relatado:*' || E'\n' || NEW.problem_description || E'\n' ||
          '━━━━━━━━━━━━━━━━━━━━';

  INSERT INTO public.wapi_outbox (kind, target_type, phone, message, origin, external_kind, external_id)
  VALUES ('text', 'group', _target_group, _msg, 'driver-checklist', 'driver-checklist', NEW.id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_driver_vehicle_checklist_insert failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_driver_vehicle_checklist
  AFTER INSERT ON public.driver_vehicle_checklists
  FOR EACH ROW EXECUTE FUNCTION public.notify_driver_vehicle_checklist_insert();
