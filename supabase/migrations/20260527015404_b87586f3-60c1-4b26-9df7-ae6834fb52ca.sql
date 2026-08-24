-- Update the WhatsApp notification message to include the attention emoji at the start
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

  _msg := '⚠️ 📋 *CHECK LIST - PROBLEMA NO VEÍCULO*' || E'\n' ||
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