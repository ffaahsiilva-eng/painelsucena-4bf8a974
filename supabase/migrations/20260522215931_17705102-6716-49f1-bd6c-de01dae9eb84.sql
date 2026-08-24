
-- 1. Tighten permissive INSERT policy on auth_attempts
DROP POLICY IF EXISTS "Anyone can insert auth attempts" ON public.auth_attempts;
CREATE POLICY "Anyone can insert auth attempts"
ON public.auth_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NULL OR (length(email) <= 254 AND email = lower(email))
);

-- 2. Fix mutable search_path on sync_profile_environment_access
CREATE OR REPLACE FUNCTION public.sync_profile_environment_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.environment IS NOT NULL THEN
        INSERT INTO public.user_environment_access (user_id, environment)
        VALUES (NEW.user_id, NEW.environment)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$function$;

-- 3. Add admin-only SELECT policy on chat_notification_logs (RLS enabled, no policies)
CREATE POLICY "Admins can view chat notification logs"
ON public.chat_notification_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
