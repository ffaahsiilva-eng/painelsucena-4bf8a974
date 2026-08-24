CREATE OR REPLACE FUNCTION public.enqueue_driver_status_notification(
  _equipment_id uuid,
  _new_status text,
  _previous_status text DEFAULT NULL::text,
  _driver_name text DEFAULT NULL::text,
  _extra_info text DEFAULT NULL::text,
  _water_point text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _cfg RECORD;
  _eq RECORD;
  _target_group text;
  _new_label text;
  _prev_label text;
  _msg text;
  _date_br text;
  _time_br text;
  _para_time timestamptz;
  _resolved_driver text;
  _history_driver text;
  _normalized_new text;
  _normalized_prev text;
BEGIN
  SELECT enabled, auto_send_driver_status, group_id_driver_status, group_id,
         instance_url, instance_token, instance_id
  INTO _cfg
  FROM public.wapi_config
  LIMIT 1;

  IF _cfg IS NULL OR _cfg.enabled IS NOT TRUE OR _cfg.auto_send_driver_status IS NOT TRUE THEN
    RETURN;
  END IF;

  _target_group := COALESCE(NULLIF(trim(_cfg.group_id_driver_status), ''), NULLIF(trim(_cfg.group_id), ''));
  IF _target_group IS NULL OR _cfg.instance_url IS NULL OR _cfg.instance_token IS NULL OR _cfg.instance_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id, name, plate, driver
  INTO _eq
  FROM public.equipment
  WHERE id = _equipment_id
  LIMIT 1;

  IF _eq IS NULL THEN
    RETURN;
  END IF;

  _normalized_new := COALESCE(NULLIF(_new_status, 'none'), 'operando');
  _normalized_prev := COALESCE(NULLIF(_previous_status, 'none'), 'operando');

  _new_label := CASE _normalized_new
    WHEN 'operando' THEN '▶️ Operando'
    WHEN 'waiting' THEN '⏸️ Aguardando Frente'
    WHEN 'rain' THEN '🌧️ Parado (Chuva)'
    WHEN 'end_of_day' THEN '⛽ Abastecendo'
    WHEN 'abastecimento' THEN '⛽ Abastecendo'
    WHEN 'end_of_shift' THEN '🌙 Fim de Turno'
    WHEN 'maintenance' THEN '🔧 Manutenção'
    WHEN 'manutencao_corretiva' THEN '🔧 Manutenção Corretiva'
    WHEN 'manutencao_preventiva' THEN '🔧 Manutenção Preventiva'
    WHEN 'aguardando_frente_servico' THEN '⏸️ Aguardando Frente'
    WHEN 'fim_turno' THEN '🌙 Fim de Turno'
    ELSE _normalized_new
  END;

  _prev_label := CASE _normalized_prev
    WHEN 'operando' THEN '▶️ Operando'
    WHEN 'waiting' THEN '⏸️ Aguardando Frente'
    WHEN 'rain' THEN '🌧️ Parado (Chuva)'
    WHEN 'end_of_day' THEN '⛽ Abastecendo'
    WHEN 'abastecimento' THEN '⛽ Abastecendo'
    WHEN 'end_of_shift' THEN '🌙 Fim de Turno'
    WHEN 'maintenance' THEN '🔧 Manutenção'
    WHEN 'manutencao_corretiva' THEN '🔧 Manutenção Corretiva'
    WHEN 'manutencao_preventiva' THEN '🔧 Manutenção Preventiva'
    WHEN 'aguardando_frente_servico' THEN '⏸️ Aguardando Frente'
    WHEN 'fim_turno' THEN '🌙 Fim de Turno'
    ELSE _normalized_prev
  END;

  SELECT h.changed_by_driver
  INTO _history_driver
  FROM public.equipment_stop_history h
  WHERE h.equipment_id = _equipment_id
    AND NULLIF(trim(h.changed_by_driver), '') IS NOT NULL
    AND h.changed_by_driver NOT ILIKE 'Sistema%'
  ORDER BY h.created_at DESC, h.started_at DESC
  LIMIT 1;

  _resolved_driver := COALESCE(
    NULLIF(trim(CASE WHEN COALESCE(_driver_name, '') ILIKE 'Sistema%' THEN NULL ELSE _driver_name END), ''),
    NULLIF(trim(_eq.driver), ''),
    NULLIF(trim(_history_driver), ''),
    '—'
  );

  _para_time := now() - interval '3 hours';
  _date_br := to_char(_para_time, 'DD/MM/YYYY');
  _time_br := to_char(_para_time, 'HH24:MI');

  _msg := '🚜 *STATUS DO EQUIPAMENTO*' || E'\n' ||
          '━━━━━━━━━━━━━━━━━━━━' || E'\n\n' ||
          '*Equipamento:* ' || COALESCE(_eq.name, '—') || E'\n' ||
          '*Placa/ID:* ' || COALESCE(_eq.plate, '—') || E'\n' ||
          '*Data:* ' || _date_br || E'\n' ||
          '*Horário:* ' || _time_br || E'\n';

  IF _previous_status IS NOT NULL THEN
    _msg := _msg || '*Mudança:* ' || _prev_label || ' → ' || _new_label || E'\n';
  ELSE
    _msg := _msg || '*Status:* ' || _new_label || E'\n';
  END IF;

  IF NULLIF(trim(_water_point), '') IS NOT NULL THEN
    _msg := _msg || '*Ponto de Água:* ' || trim(_water_point) || E'\n';
  END IF;

  IF NULLIF(trim(_extra_info), '') IS NOT NULL THEN
    _msg := _msg || E'\n' || trim(_extra_info) || E'\n';
  END IF;

  _msg := _msg || E'\n*Motorista:* ' || _resolved_driver || E'\n' ||
          '━━━━━━━━━━━━━━━━━━━━';

  IF EXISTS (
    SELECT 1
    FROM public.wapi_outbox
    WHERE origin = 'driver-status'
      AND external_kind = 'equipment-status'
      AND external_id = _equipment_id
      AND created_at > now() - interval '10 seconds'
      AND message LIKE '%' || _new_label || '%'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.wapi_outbox (kind, target_type, phone, message, origin, external_kind, external_id)
  VALUES ('text', 'group', _target_group, _msg, 'driver-status', 'equipment-status', _equipment_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_driver_refueling_point_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _point text;
  _driver_name text;
BEGIN
  IF NEW.stop_reason IS DISTINCT FROM 'abastecimento' THEN
    RETURN NEW;
  END IF;

  _point := trim(substring(NEW.defect_description from 'Ponto:\s*(.+)$'));

  SELECT h.changed_by_driver
  INTO _driver_name
  FROM public.equipment_stop_history h
  WHERE h.equipment_id = NEW.equipment_id
    AND NULLIF(trim(h.changed_by_driver), '') IS NOT NULL
    AND h.changed_by_driver NOT ILIKE 'Sistema%'
  ORDER BY h.created_at DESC, h.started_at DESC
  LIMIT 1;

  PERFORM public.enqueue_driver_status_notification(
    NEW.equipment_id,
    'abastecimento',
    NULL,
    CASE WHEN COALESCE(NEW.changed_by_driver, '') ILIKE 'Sistema%' THEN NULL ELSE COALESCE(NULLIF(trim(NEW.changed_by_driver), ''), NULLIF(trim(_driver_name), '')) END,
    NULL,
    NULLIF(_point, '')
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_driver_refueling_point_insert failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;