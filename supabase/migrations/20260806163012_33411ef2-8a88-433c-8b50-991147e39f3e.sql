-- Function to clean up stale equipment assignments (e.g., from previous days)
CREATE OR REPLACE FUNCTION public.rpc_cleanup_stale_equipment_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Clear driver and helper for equipment that hasn't been updated since yesterday
    -- and doesn't have an active shift today.
    UPDATE public.equipment e
    SET 
        driver = '',
        helper = '',
        updated_at = NOW()
    WHERE (e.driver IS NOT NULL AND e.driver != '')
      AND NOT EXISTS (
          SELECT 1 
          FROM public.daily_shift_records ds 
          WHERE ds.equipment_id = e.id 
            AND ds.shift_date = CURRENT_DATE 
            AND ds.shift_end_time IS NULL
      )
      AND e.updated_at < CURRENT_DATE;
END;
$$;

-- Function to claim equipment with concurrency protection
CREATE OR REPLACE FUNCTION public.rpc_claim_equipment(
    p_equipment_id UUID,
    p_driver_name TEXT,
    p_helper_name TEXT,
    p_user_id UUID,
    p_environment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_equipment RECORD;
    v_active_shift RECORD;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- 0. Cleanup stale assignments first
    PERFORM public.rpc_cleanup_stale_equipment_assignments();

    -- 1. Get equipment and lock the row for update to prevent race conditions
    SELECT * INTO v_equipment
    FROM public.equipment
    WHERE id = p_equipment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Equipamento não encontrado.');
    END IF;

    -- 2. Check if equipment is in maintenance or otherwise unavailable
    IF v_equipment.stop_reason IN ('manutencao_fora', 'manutencao_externa', 'oficina_externa') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Equipamento em manutenção externa e indisponível.');
    END IF;

    -- 3. Check if equipment already has a driver assigned in the 'driver' field
    IF v_equipment.driver IS NOT NULL AND v_equipment.driver != '' AND v_equipment.driver != p_driver_name THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Este equipamento já foi selecionado por ' || v_equipment.driver || '.');
    END IF;

    -- 4. Check if there is an active shift record for today by another driver
    SELECT * INTO v_active_shift
    FROM public.daily_shift_records
    WHERE equipment_id = p_equipment_id
      AND shift_date = v_today
      AND shift_end_time IS NULL
      AND driver_name != p_driver_name
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Este equipamento possui um turno ativo iniciado por ' || v_active_shift.driver_name || '.');
    END IF;

    -- 5. Environment check (if provided)
    IF p_environment IS NOT NULL AND v_equipment.environment != p_environment THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Equipamento não pertence ao seu ambiente atual.');
    END IF;

    -- 6. Claim the equipment
    UPDATE public.equipment
    SET 
        driver = p_driver_name,
        helper = p_helper_name,
        stop_reason = NULL,
        stop_start_time = NULL,
        updated_at = NOW()
    WHERE id = p_equipment_id;

    RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_claim_equipment TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_claim_equipment TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_cleanup_stale_equipment_assignments TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cleanup_stale_equipment_assignments TO service_role;
