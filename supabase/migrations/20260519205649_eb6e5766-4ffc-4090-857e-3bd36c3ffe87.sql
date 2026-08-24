-- Enfileira WhatsApp automaticamente para entrada/saída de equipamentos,
-- sem depender da chamada do navegador.
CREATE OR REPLACE FUNCTION public.notify_equipment_movement_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cfg RECORD;
  _target_group text;
  _creator_name text;
  _reason_label text;
  _header_emoji text;
  _header_label text;
  _date_br text;
  _time_br text;
  _message text;
  _is_exit boolean;
BEGIN
  SELECT enabled, auto_send_equipment_movements, group_id_equipment_movements, group_id,
         instance_url, instance_token, instance_id
  INTO _cfg
  FROM public.wapi_config
  LIMIT 1;

  IF _cfg IS NULL OR _cfg.enabled IS NOT TRUE OR _cfg.auto_send_equipment_movements IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  _target_group := COALESCE(NULLIF(trim(_cfg.group_id_equipment_movements), ''), NULLIF(trim(_cfg.group_id), ''));
  IF _target_group IS NULL OR _cfg.instance_url IS NULL OR _cfg.instance_token IS NULL OR _cfg.instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO _creator_name
  FROM public.profiles
  WHERE user_id = NEW.created_by
  LIMIT 1;

  _is_exit := NEW.movement_type::text = 'saida';
  _header_emoji := CASE WHEN _is_exit THEN '🚪➡️' ELSE '⬅️🏠' END;
  _header_label := CASE WHEN _is_exit THEN 'SAÍDA DE EQUIPAMENTO' ELSE 'ENTRADA DE EQUIPAMENTO' END;

  _date_br := COALESCE(to_char(NEW.movement_date, 'DD/MM/YYYY'), to_char((now() - interval '3 hours')::date, 'DD/MM/YYYY'));
  _time_br := COALESCE(to_char(NEW.movement_time, 'HH24:MI'), to_char(now() - interval '3 hours', 'HH24:MI'));

  _reason_label := CASE NEW.exit_reason::text
    WHEN 'manutencao_corretiva' THEN '🔧 Manutenção Corretiva'
    WHEN 'manutencao_preventiva' THEN '🛠️ Manutenção Preventiva'
    WHEN 'vistoria' THEN '🔎 Vistoria'
    WHEN 'operando' THEN '🟢 Operando'
    WHEN 'aguardando_frente_servico' THEN '⏸️ Aguardando Frente de Serviço'
    WHEN 'fim_turno' THEN '🌙 Fim de Turno'
    ELSE COALESCE(NEW.exit_reason::text, CASE WHEN _is_exit THEN '—' ELSE 'Retorno ao canteiro' END)
  END;

  _message := _header_emoji || ' *' || _header_label || '*' || E'\n' ||
              '━━━━━━━━━━━━━━━━━━━━' || E'\n\n' ||
              '*Equipamento:* ' || COALESCE(NEW.equipment_name, '—') || E'\n' ||
              '*Placa/ID:* ' || COALESCE(NEW.plate, '—') || E'\n' ||
              '*Data:* ' || _date_br || E'\n' ||
              '*Horário:* ' || _time_br || E'\n' ||
              '*' || CASE WHEN _is_exit THEN 'Motivo da Saída' ELSE 'Tipo' END || ':* ' || _reason_label || E'\n';

  IF NULLIF(trim(COALESCE(NEW.problem_description, '')), '') IS NOT NULL THEN
    _message := _message || E'\n*Descrição do problema:*\n' || trim(NEW.problem_description) || E'\n';
  END IF;

  IF NULLIF(trim(COALESCE(NEW.observation, '')), '') IS NOT NULL THEN
    _message := _message || E'\n*Observação:*\n' || trim(NEW.observation) || E'\n';
  END IF;

  _message := _message || E'\n*Registrado por:* ' || COALESCE(NULLIF(trim(_creator_name), ''), '—') || E'\n' ||
              '━━━━━━━━━━━━━━━━━━━━';

  IF EXISTS (
    SELECT 1 FROM public.wapi_outbox
    WHERE origin = 'equipment-movement'
      AND external_kind = 'equipment-movement'
      AND external_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.wapi_outbox (kind, target_type, phone, message, origin, external_kind, external_id)
  VALUES ('text', 'group', _target_group, _message, 'equipment-movement', 'equipment-movement', NEW.id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_equipment_movement_insert failed for movement %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_equipment_movement_insert ON public.equipment_movements;
CREATE TRIGGER trg_notify_equipment_movement_insert
AFTER INSERT ON public.equipment_movements
FOR EACH ROW
EXECUTE FUNCTION public.notify_equipment_movement_insert();

-- Enfileira uma Parte Diária resumida sempre que um turno for finalizado.
CREATE OR REPLACE FUNCTION public.notify_daily_shift_finalized()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  IF EXISTS (
    SELECT 1 FROM public.wapi_outbox
    WHERE origin = 'daily-shift-report'
      AND external_kind = 'daily-shift-record'
      AND external_id = NEW.id
      AND status IN ('sent', 'processing')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.wapi_outbox (kind, target_type, phone, message, origin, external_kind, external_id)
  VALUES ('text', 'group', _target_group, _message, 'daily-shift-report', 'daily-shift-record', NEW.id);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_daily_shift_finalized failed for shift %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_daily_shift_finalized_insert ON public.daily_shift_records;
CREATE TRIGGER trg_notify_daily_shift_finalized_insert
AFTER INSERT ON public.daily_shift_records
FOR EACH ROW
WHEN (NEW.shift_end_time IS NOT NULL)
EXECUTE FUNCTION public.notify_daily_shift_finalized();

DROP TRIGGER IF EXISTS trg_notify_daily_shift_finalized_update ON public.daily_shift_records;
CREATE TRIGGER trg_notify_daily_shift_finalized_update
AFTER UPDATE OF shift_end_time, final_horimeter, final_km, final_fuel_level ON public.daily_shift_records
FOR EACH ROW
WHEN (NEW.shift_end_time IS NOT NULL)
EXECUTE FUNCTION public.notify_daily_shift_finalized();