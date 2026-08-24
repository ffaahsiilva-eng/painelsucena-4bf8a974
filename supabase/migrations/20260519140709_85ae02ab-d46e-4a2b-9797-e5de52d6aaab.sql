
-- Função que enfileira a notificação de mudança de status do equipamento direto no wapi_outbox
CREATE OR REPLACE FUNCTION public.notify_driver_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cfg RECORD;
  _target_group text;
  _new_label text;
  _prev_label text;
  _msg text;
  _date_br text;
  _time_br text;
  _para_time timestamptz;
BEGIN
  -- Só dispara quando o stop_reason realmente muda
  IF NEW.stop_reason IS NOT DISTINCT FROM OLD.stop_reason THEN
    RETURN NEW;
  END IF;

  -- Lê config do WhatsApp
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

  -- Evita duplicação: se já existe uma mensagem driver-status para este equipamento nos últimos 10s, pula
  -- (cobre o caso do cliente conseguir invocar wapi-driver-status-notify normalmente)
  IF EXISTS (
    SELECT 1 FROM public.wapi_outbox
    WHERE origin = 'driver-status'
      AND created_at > now() - interval '10 seconds'
      AND message LIKE '%' || NEW.name || '%'
  ) THEN
    RETURN NEW;
  END IF;

  _new_label := CASE COALESCE(NULLIF(NEW.stop_reason, 'none'), 'operando')
    WHEN 'operando' THEN '▶️ Operando'
    WHEN 'waiting' THEN '⏸️ Aguardando Frente'
    WHEN 'rain' THEN '🌧️ Parado (Chuva)'
    WHEN 'end_of_day' THEN '⛽ Abastecendo'
    WHEN 'abastecimento' THEN '⛽ Abastecendo'
    WHEN 'end_of_shift' THEN '🌙 Fim de Turno'
    WHEN 'maintenance' THEN '🔧 Manutenção'
    WHEN 'manutencao_corretiva' THEN '🔧 Manutenção Corretiva'
    WHEN 'manutencao_preventiva' THEN '🔧 Manutenção Preventiva'
    ELSE COALESCE(NULLIF(NEW.stop_reason, 'none'), 'Operando')
  END;

  _prev_label := CASE COALESCE(NULLIF(OLD.stop_reason, 'none'), 'operando')
    WHEN 'operando' THEN '▶️ Operando'
    WHEN 'waiting' THEN '⏸️ Aguardando Frente'
    WHEN 'rain' THEN '🌧️ Parado (Chuva)'
    WHEN 'end_of_day' THEN '⛽ Abastecendo'
    WHEN 'abastecimento' THEN '⛽ Abastecendo'
    WHEN 'end_of_shift' THEN '🌙 Fim de Turno'
    WHEN 'maintenance' THEN '🔧 Manutenção'
    WHEN 'manutencao_corretiva' THEN '🔧 Manutenção Corretiva'
    WHEN 'manutencao_preventiva' THEN '🔧 Manutenção Preventiva'
    ELSE COALESCE(NULLIF(OLD.stop_reason, 'none'), 'Operando')
  END;

  _para_time := now() - interval '3 hours';
  _date_br := to_char(_para_time, 'DD/MM/YYYY');
  _time_br := to_char(_para_time, 'HH24:MI');

  _msg := '🚜 *STATUS DO EQUIPAMENTO*' || E'\n' ||
          '━━━━━━━━━━━━━━━━━━━━' || E'\n\n' ||
          '*Equipamento:* ' || COALESCE(NEW.name, '—') || E'\n' ||
          '*Placa/ID:* ' || COALESCE(NEW.plate, '—') || E'\n' ||
          '*Data:* ' || _date_br || E'\n' ||
          '*Horário:* ' || _time_br || E'\n' ||
          '*Mudança:* ' || _prev_label || ' → ' || _new_label || E'\n' ||
          '*Motorista:* ' || COALESCE(NULLIF(NEW.changed_by_driver, ''), NULLIF(NEW.driver, ''), '—') || E'\n' ||
          '━━━━━━━━━━━━━━━━━━━━';

  INSERT INTO public.wapi_outbox (kind, target_type, phone, message, origin)
  VALUES ('text', 'group', _target_group, _msg, 'driver-status');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_driver_status_change failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_driver_status_change ON public.equipment;
CREATE TRIGGER trg_notify_driver_status_change
AFTER UPDATE OF stop_reason ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.notify_driver_status_change();
