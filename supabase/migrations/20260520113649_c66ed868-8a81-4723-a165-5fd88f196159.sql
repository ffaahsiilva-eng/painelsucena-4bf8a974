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

  -- Skip notifications for system-automated transitions (no driver logged in
  -- and the most recent history entry was inserted by an automation job).
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

  -- O início de abastecimento com ponto é enviado pelo trigger do histórico,
  -- pois o ponto só existe depois que o registro de histórico é criado.
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