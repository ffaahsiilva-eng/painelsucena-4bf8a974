
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
  IF NEW.stop_reason IS DISTINCT FROM 'end_of_shift' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.stop_reason = 'end_of_shift' THEN
    RETURN NEW;
  END IF;

  SELECT id, name, plate, driver, helper, equipment_type INTO _eq
  FROM public.equipment WHERE id = NEW.id;

  -- Somente Pipa e Munck geram Parte Diária automática
  IF _eq.equipment_type::text NOT IN ('pipa', 'munk') THEN
    RETURN NEW;
  END IF;

  _resolved_driver := COALESCE(
    NULLIF(trim(NEW.changed_by_driver), ''),
    NULLIF(trim(_eq.driver), '')
  );

  SELECT * INTO _existing
  FROM public.daily_shift_records
  WHERE equipment_id = NEW.id AND shift_date = _today
  ORDER BY created_at DESC
  LIMIT 1;

  -- Exige motorista registrado (no registro existente OU no equipamento)
  IF COALESCE(NULLIF(trim(_existing.driver_name), ''), _resolved_driver) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _prev
  FROM public.daily_shift_records
  WHERE equipment_id = NEW.id AND shift_date < _today
  ORDER BY shift_date DESC
  LIMIT 1;

  _initial_h := COALESCE(_existing.initial_horimeter, _prev.final_horimeter, _prev.initial_horimeter);
  _initial_km := COALESCE(_existing.initial_km, _prev.final_km, _prev.initial_km);
  _initial_fuel := COALESCE(_existing.initial_fuel_level, _prev.final_fuel_level, _prev.initial_fuel_level);

  IF _resolved_driver ILIKE 'Sistema%' THEN
    _resolved_driver := NULLIF(trim(_eq.driver), '');
  END IF;
  _resolved_driver := COALESCE(_resolved_driver, NULLIF(trim(_existing.driver_name), ''));

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
