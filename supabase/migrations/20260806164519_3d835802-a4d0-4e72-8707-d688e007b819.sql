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
BEGIN
    -- 1. Get equipment and lock the row
    SELECT * INTO v_equipment
    FROM public.equipment
    WHERE id = p_equipment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Equipamento não encontrado.');
    END IF;

    -- 2. Environment check
    IF p_environment IS NOT NULL AND v_equipment.environment != p_environment THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Equipamento não pertence ao seu ambiente atual.');
    END IF;

    -- 3. Maintenance check
    IF v_equipment.stop_reason IN ('manutencao_fora', 'manutencao_externa', 'oficina_externa') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Equipamento em manutenção externa e indisponível.');
    END IF;

    -- 4. Check for active shift
    SELECT * INTO v_active_shift
    FROM public.daily_shift_records
    WHERE equipment_id = p_equipment_id
      AND shift_end_time IS NULL
      AND driver_name != p_driver_name
    ORDER BY shift_start_time DESC
    LIMIT 1;

    -- 5. Logic for abandoned shifts
    IF FOUND THEN
        -- If the shift started more than 22 hours ago, consider it abandoned and close it
        IF v_active_shift.shift_start_time < (NOW() - INTERVAL '22 hours') THEN
            -- Auto-close the abandoned shift
            UPDATE public.daily_shift_records
            SET shift_end_time = NOW(),
                status = 'finalizado',
                updated_at = NOW()
            WHERE id = v_active_shift.id;
            
            -- Log the auto-closure in audit logs if the table exists
            INSERT INTO public.admin_audit_logs (action, details, created_by)
            VALUES ('auto_close_abandoned_shift', 
                    jsonb_build_object('equipment_id', p_equipment_id, 'old_driver', v_active_shift.driver_name, 'old_shift_id', v_active_shift.id), 
                    p_user_id);
        ELSE
            -- Return detailed error for active shift that isn't abandoned
            RETURN jsonb_build_object(
                'ok', false, 
                'error', 'Equipamento em uso.',
                'driver_name', v_active_shift.driver_name,
                'equipment_name', v_equipment.name,
                'shift_start_time', v_active_shift.shift_start_time
            );
        END IF;
    END IF;

    -- 6. Check if driver field is set by someone else (fallback check)
    IF v_equipment.driver IS NOT NULL AND v_equipment.driver != '' AND v_equipment.driver != p_driver_name THEN
        -- If we are here, it means either there was no active shift or we auto-closed one,
        -- so we should clear the stale driver field.
        -- But for safety, if it was JUST set (last updated < 5 mins ago) and no shift found, 
        -- we might want to respect it. However, the requirement is to auto-close abandoned usage.
    END IF;

    -- 7. Claim the equipment
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