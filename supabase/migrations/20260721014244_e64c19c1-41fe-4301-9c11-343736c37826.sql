
CREATE TABLE IF NOT EXISTS public.driver_error_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_name TEXT,
  equipment_id UUID,
  equipment_name TEXT,
  action TEXT NOT NULL,
  error_message TEXT,
  error_code TEXT,
  context JSONB,
  user_agent TEXT,
  is_online BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_driver_error_log_created_at ON public.driver_error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_error_log_user_id ON public.driver_error_log(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_error_log_action ON public.driver_error_log(action);

GRANT SELECT, INSERT ON public.driver_error_log TO authenticated;
GRANT ALL ON public.driver_error_log TO service_role;

ALTER TABLE public.driver_error_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert own driver errors"
ON public.driver_error_log
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Admins can view driver errors"
ON public.driver_error_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
