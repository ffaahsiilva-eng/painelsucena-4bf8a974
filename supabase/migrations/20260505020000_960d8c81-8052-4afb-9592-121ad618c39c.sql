CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  success boolean NOT NULL DEFAULT false,
  failure_reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_email_created ON public.auth_attempts (email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_created ON public.auth_attempts (created_at DESC);

ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can log an attempt — needed since failed logins have no session
CREATE POLICY "Anyone can insert auth attempts"
  ON public.auth_attempts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins can read auth attempts"
  ON public.auth_attempts FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only admins can delete (for cleanup)
CREATE POLICY "Admins can delete auth attempts"
  ON public.auth_attempts FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Cleanup function (90 days retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_auth_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.auth_attempts WHERE created_at < now() - interval '90 days';
END;
$$;