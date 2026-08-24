
-- Trigger that ensures a daily_shift_records row exists/has shift_end_time
-- whenever equipment.stop_reason transitions to 'end_of_shift'. This guarantees
-- that the existing notify_daily_shift_finalized trigger fires and the PARTE
-- DIÁRIA FINALIZADA text is sent to the WhatsApp group for EVERY equipment,
-- even when the driver did not go through the full handleEndOfShift flow.
CREATE OR REPLACE FUNCTION public.ensure_shift_record_on_end_of_shift()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today date := (now() - interval '3 hours')::date;
  _now timestamptz := now();
  _eq RECORD;
  _existing RECORD;
  _prev RECORD;
  _resolved_driver text;
  _resolved_helper text;
  _initial_h numeric;
  _initial_km numeric;
  _initial_fuel text;
BEGIN
  -- Only fire when transitioning INTO end_of_shift
  IF NEW.stop_reason IS DISTINCT FROM 'end_of_shift' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.stop_reason = 'end_of_shift' THEN
    RETURN NEW;
  END IF;

  SELECT id, name, plate, driver, helper INTO _eq
  FROM public.equipment WHERE id = NEW.id;

  -- Look up existing shift record for today
  SELECT * INTO _existing
  FROM public.daily_shift_records
  WHERE equipment_id = NEW.id AND shift_date = _today
  ORDER BY created_at DESC
  LIMIT 1;

  -- Pull fallback initial values from latest prior shift record
  SELECT * INTO _prev
  FROM public.daily_shift_records
  WHERE equipment_id = NEW.id AND shift_date < _today
  ORDER BY shift_date DESC
  LIMIT 1;

  _initial_h := COALESCE(_existing.initial_horimeter, _prev.final_horimeter, _prev.initial_horimeter);
  _initial_km := COALESCE(_existing.initial_km, _prev.final_km, _prev.initial_km);
  _initial_fuel := COALESCE(_existing.initial_fuel_level, _prev.final_fuel_level, _prev.initial_fuel_level);

  _resolved_driver := COALESCE(
    NULLIF(trim(_existing.driver_name), ''),
    NULLIF(trim(NEW.changed_by_driver), ''),
    NULLIF(trim(_eq.driver), ''),
    '—'
  );
  -- Strip "(editou)" suffixes etc.
  IF _resolved_driver ILIKE 'Sistema%' THEN
    _resolved_driver := COALESCE(NULLIF(trim(_eq.driver), ''), '—');
  END IF;

  _resolved_helper := COALESCE(
    NULLIF(trim(_existing.helper_name), ''),
    NULLIF(trim(_eq.helper), '')
  );

  IF _existing.id IS NOT NULL THEN
    UPDATE public.daily_shift_records
    SET shift_end_time = COALESCE(_existing.shift_end_time, _now),
        final_horimeter = COALESCE(_existing.final_horimeter, _initial_h),
        final_km = COALESCE(_existing.final_km, _initial_km),
        final_fuel_level = COALESCE(_existing.final_fuel_level, _initial_fuel),
        driver_name = COALESCE(NULLIF(trim(_existing.driver_name), ''), _resolved_driver),
        helper_name = COALESCE(_existing.helper_name, _resolved_helper),
        updated_at = _now
    WHERE id = _existing.id;
  ELSE
    INSERT INTO public.daily_shift_records (
      equipment_id, equipment_name, plate, shift_date,
      driver_name, helper_name,
      initial_horimeter, initial_km, initial_fuel_level,
      final_horimeter, final_km, final_fuel_level,
      shift_start_time, shift_end_time
    ) VALUES (
      NEW.id, _eq.name, _eq.plate, _today,
      _resolved_driver, _resolved_helper,
      _initial_h, _initial_km, _initial_fuel,
      _initial_h, _initial_km, _initial_fuel,
      _now, _now
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'ensure_shift_record_on_end_of_shift failed for equipment %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_shift_record_on_end_of_shift ON public.equipment;
CREATE TRIGGER trg_ensure_shift_record_on_end_of_shift
AFTER INSERT OR UPDATE OF stop_reason ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.ensure_shift_record_on_end_of_shift();

-- Backfill for today's missing shift records: every equipment currently in
-- end_of_shift but without a daily_shift_records row for today gets one,
-- which will fire notify_daily_shift_finalized.
DO $$
DECLARE
  _today date := (now() - interval '3 hours')::date;
  _now timestamptz := now();
  e RECORD;
  _existing_id uuid;
  _prev RECORD;
  _ih numeric; _ik numeric; _ifuel text;
BEGIN
  FOR e IN
    SELECT id, name, plate, driver, helper
    FROM public.equipment
    WHERE stop_reason = 'end_of_shift'
  LOOP
    SELECT id INTO _existing_id
    FROM public.daily_shift_records
    WHERE equipment_id = e.id AND shift_date = _today
    LIMIT 1;
    IF _existing_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    SELECT * INTO _prev
    FROM public.daily_shift_records
    WHERE equipment_id = e.id AND shift_date < _today
    ORDER BY shift_date DESC
    LIMIT 1;

    _ih := COALESCE(_prev.final_horimeter, _prev.initial_horimeter);
    _ik := COALESCE(_prev.final_km, _prev.initial_km);
    _ifuel := COALESCE(_prev.final_fuel_level, _prev.initial_fuel_level);

    INSERT INTO public.daily_shift_records (
      equipment_id, equipment_name, plate, shift_date,
      driver_name, helper_name,
      initial_horimeter, initial_km, initial_fuel_level,
      final_horimeter, final_km, final_fuel_level,
      shift_start_time, shift_end_time
    ) VALUES (
      e.id, e.name, e.plate, _today,
      COALESCE(NULLIF(trim(e.driver), ''), '—'),
      NULLIF(trim(e.helper), ''),
      _ih, _ik, _ifuel,
      _ih, _ik, _ifuel,
      _now, _now
    );
  END LOOP;
END $$;
