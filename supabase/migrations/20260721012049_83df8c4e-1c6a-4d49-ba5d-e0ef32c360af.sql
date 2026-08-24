
ALTER TABLE public.wapi_outbox ADD COLUMN IF NOT EXISTS environment text DEFAULT public.current_environment();
ALTER TABLE public.wapi_broadcasts ADD COLUMN IF NOT EXISTS environment text;
CREATE INDEX IF NOT EXISTS idx_wapi_broadcasts_env_created ON public.wapi_broadcasts(environment, created_at DESC);

CREATE OR REPLACE FUNCTION public.fn_wapi_broadcast_on_outbox()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.target_type <> 'group' THEN
    RETURN NEW;
  END IF;

  IF NEW.origin IN ('chat_notification','billing','new-user-signup','manual_resend') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.wapi_broadcasts (origin, kind, target_type, message, image_url, caption, environment)
  VALUES (NEW.origin, NEW.kind, NEW.target_type, NEW.message, NEW.image_url, NEW.caption,
          COALESCE(NEW.environment, public.current_environment()));

  RETURN NEW;
END;
$function$;
