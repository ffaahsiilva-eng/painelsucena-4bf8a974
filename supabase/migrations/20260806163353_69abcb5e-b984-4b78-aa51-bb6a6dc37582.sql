-- Create a table for administrative audit logs if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON public.admin_audit_logs
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert audit logs" ON public.admin_audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);

-- RPC for full administrative reset
CREATE OR REPLACE FUNCTION public.rpc_admin_full_reset(
    p_admin_user_id UUID,
    p_environment TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_closed_shifts_count INTEGER;
    v_updated_equipment_count INTEGER;
BEGIN
    -- 1. Security Check: ensure caller is admin
    IF NOT public.has_role(p_admin_user_id, 'admin') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Permissão negada. Apenas administradores podem executar o reset.');
    END IF;

    -- 2. Close all active shifts for the environment
    UPDATE public.daily_shift_records
    SET 
        shift_end_time = NOW(),
        updated_at = NOW()
    WHERE shift_end_time IS NULL
      AND environment = p_environment;
    
    GET DIAGNOSTICS v_closed_shifts_count = ROW_COUNT;

    -- 3. Clear all equipment assignments for the environment
    UPDATE public.equipment
    SET 
        driver = '',
        helper = '',
        stop_reason = 'none',
        stop_start_time = NULL,
        updated_at = NOW()
    WHERE environment = p_environment;

    GET DIAGNOSTICS v_updated_equipment_count = ROW_COUNT;

    -- 4. Register audit log
    INSERT INTO public.admin_audit_logs (user_id, action, details)
    VALUES (
        p_admin_user_id, 
        'FULL_DRIVER_PANEL_RESET', 
        jsonb_build_object(
            'environment', p_environment,
            'closed_shifts', v_closed_shifts_count,
            'updated_equipment', v_updated_equipment_count
        )
    );

    -- 5. Return success and info for frontend to trigger realtime broadcast
    RETURN jsonb_build_object(
        'ok', true, 
        'closed_shifts', v_closed_shifts_count, 
        'updated_equipment', v_updated_equipment_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_admin_full_reset TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_full_reset TO service_role;
