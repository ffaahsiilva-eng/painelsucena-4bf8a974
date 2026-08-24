-- Drop existing variations of the reset function
DROP FUNCTION IF EXISTS public.rpc_admin_full_reset(UUID);
DROP FUNCTION IF EXISTS public.rpc_admin_full_reset(UUID, TEXT);

-- Comprehensive reset function with environment scope
CREATE OR REPLACE FUNCTION public.rpc_admin_full_reset(
    p_admin_user_id UUID,
    p_environment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_closed_shifts INTEGER;
    v_updated_equipment INTEGER;
BEGIN
    -- 1. Finalize all active shifts
    WITH closed AS (
        UPDATE public.daily_shift_records
        SET shift_end_time = NOW(),
            status = 'finalizado',
            updated_at = NOW()
        WHERE shift_end_time IS NULL
          AND (p_environment IS NULL OR environment = p_environment)
        RETURNING id
    )
    SELECT count(*) INTO v_closed_shifts FROM closed;

    -- 2. Release all equipment
    WITH released AS (
        UPDATE public.equipment
        SET driver = NULL,
            helper = NULL,
            stop_reason = NULL,
            stop_start_time = NULL,
            updated_at = NOW()
        WHERE (p_environment IS NULL OR environment = p_environment)
        RETURNING id
    )
    SELECT count(*) INTO v_updated_equipment FROM released;

    -- 3. Audit log
    INSERT INTO public.admin_audit_logs (action, details, created_by)
    VALUES ('admin_full_reset', 
            jsonb_build_object(
                'environment', COALESCE(p_environment, 'all'),
                'closed_shifts', v_closed_shifts,
                'updated_equipment', v_updated_equipment,
                'timestamp', NOW()
            ), 
            p_admin_user_id);

    RETURN jsonb_build_object(
        'ok', true, 
        'closed_shifts', v_closed_shifts, 
        'updated_equipment', v_updated_equipment
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.rpc_admin_full_reset TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_full_reset TO service_role;
