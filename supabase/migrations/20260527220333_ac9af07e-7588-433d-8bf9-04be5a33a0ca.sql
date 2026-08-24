
CREATE OR REPLACE FUNCTION public.notify_daily_shift_finalized()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _cfg RECORD;
  _target_group text;
  _message text;
  _date_br text;
  _start_br text;
  _end_br text;
  _helper_label text;
  _fuel_initial text;
  _fuel_final text;
  _pending_id uuid;
BEGIN
  IF NEW.shift_end_time IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.shift_end_time IS NOT DISTINCT FROM NEW.shift_end_time
     AND OLD.final_horimeter IS NOT DISTINCT FROM NEW.final_horimeter
     AND OLD.final_km IS NOT DISTINCT FROM NEW.final_km
     AND OLD.final_fuel_level IS NOT DISTINCT FROM NEW.final_fuel_level THEN
    RETURN NEW;
  END IF;

  SELECT enabled, auto_send_driver_status, group_id_driver_status, group_id,
         instance_url, instance_token, instance_id
  INTO _cfg
  FROM public.wapi_config
  LIMIT 1;

  IF _cfg IS NULL OR _cfg.enabled IS NOT TRUE OR _cfg.auto_send_driver_status IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  _target_group := COALESCE(NULLIF(trim(_cfg.group_id_driver_status), ''), NULLIF(trim(_cfg.group_id), ''));
  IF _target_group IS NULL OR _cfg.instance_url IS NULL OR _cfg.instance_token IS NULL OR _cfg.instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  _date_br := to_char(NEW.shift_date, 'DD/MM/YYYY');
  _start_br := COALESCE(to_char(NEW.shift_start_time - interval '3 hours', 'HH24:MI'), '—');
  _end_br := COALESCE(to_char(NEW.shift_end_time - interval '3 hours', 'HH24:MI'), '—');

  _helper_label := CASE
    WHEN EXISTS (SELECT 1 FROM public.equipment e WHERE e.id = NEW.equipment_id AND e.equipment_type::text = 'munk') THEN 'Sinaleiro'
    ELSE 'Ajudante'
  END;

  _fuel_initial := CASE NEW.initial_fuel_level
    WHEN 'empty' THEN 'Vazio'
    WHEN 'quarter' THEN '1/4'
    WHEN 'half' THEN '1/2'
    WHEN 'three_quarters' THEN '3/4'
    WHEN 'full' THEN 'Cheio'
    ELSE COALESCE(NEW.initial_fuel_level, '—')
  END;

  _fuel_final := CASE NEW.final_fuel_level
    WHEN 'empty' THEN 'Vazio'
    WHEN 'quarter' THEN '1/4'
    WHEN 'half' THEN '1/2'
    WHEN 'three_quarters' THEN '3/4'
    WHEN 'full' THEN 'Cheio'
    ELSE COALESCE(NEW.final_fuel_level, '—')
  END;

  _message := '📄 *PARTE DIÁRIA FINALIZADA*' || E'\n' ||
              '━━━━━━━━━━━━━━━━━━━━' || E'\n\n' ||
              '*Equipamento:* ' || COALESCE(NEW.equipment_name, '—') || E'\n' ||
              '*Placa/ID:* ' || COALESCE(NEW.plate, '—') || E'\n' ||
              '*Data:* ' || _date_br || E'\n' ||
              '*Início:* ' || _start_br || E'\n' ||
              '*Fim:* ' || _end_br || E'\n\n' ||
              '*Motorista:* ' || COALESCE(NULLIF(trim(NEW.driver_name), ''), '—') || E'\n' ||
              '*' || _helper_label || ':* ' || COALESCE(NULLIF(trim(NEW.helper_name), ''), '—') || E'\n\n' ||
              '*Combustível inicial:* ' || _fuel_initial || E'\n' ||
              '*Combustível final:* ' || _fuel_final || E'\n' ||
              '*Horímetro inicial:* ' || COALESCE(NEW.initial_horimeter::text, '—') || E'\n' ||
              '*Horímetro final:* ' || COALESCE(NEW.final_horimeter::text, '—') || E'\n' ||
              '*KM inicial:* ' || COALESCE(NEW.initial_km::text, '—') || E'\n' ||
              '*KM final:* ' || COALESCE(NEW.final_km::text, '—') || E'\n' ||
              '━━━━━━━━━━━━━━━━━━━━';

  -- Reaproveita pending existente (evita duplicar na fila), mas sem janela de tempo
  SELECT id INTO _pending_id
  FROM public.wapi_outbox
  WHERE origin = 'daily-shift-report'
    AND external_kind = 'daily-shift-record'
    AND external_id = NEW.id
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF _pending_id IS NOT NULL THEN
    UPDATE public.wapi_outbox
    SET phone = _target_group,
        message = _message,
        updated_at = now()
    WHERE id = _pending_id;
    RETURN NEW;
  END IF;

  -- Sem bloqueio por envios anteriores: cada Fim de Turno gera uma nova Parte Diária
  INSERT INTO public.wapi_outbox (kind, target_type, phone, message, origin, external_kind, external_id)
  VALUES ('text', 'group', _target_group, _message, 'daily-shift-report', 'daily-shift-record', NEW.id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_daily_shift_finalized failed for shift %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;
