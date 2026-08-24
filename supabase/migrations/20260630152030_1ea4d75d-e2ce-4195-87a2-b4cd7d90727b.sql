CREATE OR REPLACE FUNCTION public.has_environment_access(_user_id uuid, _environment text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_environment_access
      WHERE user_id = _user_id AND environment = _environment
    )
$function$;