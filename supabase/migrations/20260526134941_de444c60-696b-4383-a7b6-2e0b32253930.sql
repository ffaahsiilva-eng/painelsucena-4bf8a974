CREATE OR REPLACE FUNCTION public.notify_driver_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _new_status text;
  _old_status text;
  _point text;
  _extra text;
  _last_history_driver text;
BEGIN
  IF NEW.stop_reason IS NOT DISTINCT FROM OLD.stop_reason THEN
    RETURN NEW;
  END IF;

  _new_status := COALESCE(NEW.stop_reason, 'none');
  _old_status := COALESCE(OLD.stop_reason, 'none');

  -- Fim de Turno: não enviar mensagem genérica de status; a "Parte Diária Finalizada"
  -- já é enviada pelo trigger notify_daily_shift_finalized, evitando duplicidade no grupo.
  IF COALESCE(NULLIF(_new_status, 'none'), '') IN ('end_of_shift', 'fim_turno') THEN
    RETURN NEW;
  END IF;

  IF NULLIF(trim(COALESCE(NEW.driver, '')), '') IS NULL THEN
    SELECT h.changed_by_driver
    INTO _last_history_driver
    FROM public.equipment_stop_history h
    WHERE h.equipment_id = NEW.id
    ORDER BY h.created_at DESC, h.started_at DESC
    LIMIT 1;

    IF _last_history_driver ILIKE 'Sistema%' OR _last_history_driver IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF COALESCE(NULLIF(_new_status, 'none'), 'operando') = 'abastecimento' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NULLIF(_new_status, 'none'), 'operando') = 'operando'
     AND COALESCE(NULLIF(_old_status, 'none'), 'operando') = 'abastecimento' THEN
    SELECT trim(substring(h.defect_description from 'Ponto:\s*(.+)$'))
    INTO _point
    FROM public.equipment_stop_history h
    WHERE h.equipment_id = NEW.id
      AND h.stop_reason = 'abastecimento'
      AND h.defect_description ~* 'Ponto:\s*'
    ORDER BY h.started_at DESC, h.created_at DESC
    LIMIT 1;

    IF NULLIF(_point, '') IS NOT NULL THEN
      _extra := '*Retorno do Ponto ' || _point || '*';
    END IF;
  END IF;

  PERFORM public.enqueue_driver_status_notification(
    NEW.id,
    _new_status,
    _old_status,
    NULL,
    _extra,
    NULL
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_driver_status_change failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;