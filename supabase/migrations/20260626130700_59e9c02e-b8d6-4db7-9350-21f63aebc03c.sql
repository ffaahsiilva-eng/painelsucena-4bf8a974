
CREATE OR REPLACE FUNCTION public.notify_equipment_mobilization_insert()
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
  _dedupe text;
  _para_time timestamptz;
BEGIN
  SELECT enabled, auto_send_equipment_movements, group_id_equipment_movements, group_id,
         instance_url, instance_token, instance_id
  INTO _cfg FROM public.wapi_config LIMIT 1;

  IF _cfg IS NULL OR _cfg.enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  _target_group := COALESCE(NULLIF(trim(_cfg.group_id_equipment_movements), ''), NULLIF(trim(_cfg.group_id), ''));
  IF _target_group IS NULL THEN
    RETURN NEW;
  END IF;

  _dedupe := 'mobilization|' || COALESCE(NEW.plate, NEW.id::text);

  IF EXISTS (
    SELECT 1 FROM public.wapi_outbox
    WHERE origin = 'equipment-mobilization'
      AND COALESCE(dedupe_key, '') = _dedupe
      AND created_at > now() - interval '7 days'
  ) THEN
    RETURN NEW;
  END IF;

  _para_time := now() - interval '3 hours';
  _date_br := to_char(_para_time, 'DD/MM/YYYY');
  _time_br := to_char(_para_time, 'HH24:MI');

  _msg := '🆕🚜 *NOVO EQUIPAMENTO MOBILIZADO*' || E'\n' ||
          '━━━━━━━━━━━━━━━━━━━━' || E'\n\n' ||
          '*Equipamento:* ' || COALESCE(NEW.name, '—') || E'\n' ||
          '*Placa/ID:* ' || COALESCE(NEW.plate, '—') || E'\n' ||
          '*Data:* ' || _date_br || E'\n' ||
          '*Horário:* ' || _time_br || E'\n' ||
          '*Tipo:* 🚧 Mobilização (novo cadastro)' || E'\n\n' ||
          'Equipamento adicionado à obra e disponível no painel.' || E'\n' ||
          '━━━━━━━━━━━━━━━━━━━━';

  INSERT INTO public.wapi_outbox (kind, target_type, phone, message, origin, external_kind, external_id, dedupe_key)
  VALUES ('text', 'group', _target_group, _msg, 'equipment-mobilization', 'equipment-mobilization', NEW.id, _dedupe);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_equipment_mobilization_insert failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_equipment_mobilization ON public.equipment;
CREATE TRIGGER trg_notify_equipment_mobilization
AFTER INSERT ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.notify_equipment_mobilization_insert();
