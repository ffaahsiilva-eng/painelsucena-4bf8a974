
-- Dedup de notificações de movimentação de equipamento:
-- bloqueia reenvio do mesmo equipamento + tipo (entrada/saída) + motivo
-- nos últimos 10 minutos, em qualquer estado da fila.

CREATE OR REPLACE FUNCTION public.notify_equipment_movement_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  _dup_count int;
  _dedupe_key text;
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

  -- Dedupe: mesmo equipamento + tipo + motivo nas últimas 10 minutos
  _dedupe_key := COALESCE(NEW.equipment_id::text, NEW.plate, '') || '|' ||
                 COALESCE(NEW.movement_type::text, '') || '|' ||
                 COALESCE(NEW.exit_reason::text, '');

  SELECT COUNT(*) INTO _dup_count
  FROM public.wapi_outbox
  WHERE origin = 'equipment-movement'
    AND external_kind = 'equipment-movement'
    AND created_at > now() - interval '10 minutes'
    AND status IN ('pending','processing','sent')
    AND COALESCE(dedupe_key, '') = _dedupe_key;

  IF _dup_count > 0 THEN
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

  INSERT INTO public.wapi_outbox (kind, target_type, phone, message, origin, external_kind, external_id, dedupe_key)
  VALUES ('text', 'group', _target_group, _message, 'equipment-movement', 'equipment-movement', NEW.id, _dedupe_key);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_equipment_movement_insert failed for movement %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Limpa duplicatas pendentes do Munck (e similares) que ainda não foram enviadas:
-- mantém apenas a mais antiga de cada (equipamento + tipo + motivo) na janela de 10 min.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY external_kind,
                        regexp_replace(message, '\*Horário:\*[^\n]*', '', 'g'),
                        regexp_replace(message, '\*Data:\*[^\n]*', '', 'g')
           ORDER BY created_at ASC
         ) AS rn
  FROM public.wapi_outbox
  WHERE origin = 'equipment-movement'
    AND status = 'pending'
)
DELETE FROM public.wapi_outbox
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
