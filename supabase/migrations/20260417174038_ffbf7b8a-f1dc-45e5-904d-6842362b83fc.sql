CREATE OR REPLACE FUNCTION public.sync_instacena_to_opshub()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'net'
AS $function$
DECLARE
  _type text;
  _action text;
  _record jsonb;
  _old jsonb;
  _payload jsonb;
  _origin text;
  _request_id bigint;
BEGIN
  _type := CASE TG_TABLE_NAME
    WHEN 'instacena_posts' THEN 'post'
    WHEN 'instacena_comments' THEN 'comment'
    WHEN 'instacena_reactions' THEN 'reaction'
    ELSE NULL
  END;
  IF _type IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  _action := TG_OP;

  IF TG_OP = 'DELETE' THEN
    _origin := COALESCE((to_jsonb(OLD) ->> 'origin'), 'local');
  ELSE
    _origin := COALESCE((to_jsonb(NEW) ->> 'origin'), 'local');
  END IF;

  -- Só sincroniza registros LOCAIS (não eco do OpsHub)
  IF _origin <> 'local' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  _record := to_jsonb(COALESCE(NEW, OLD));
  _old := to_jsonb(OLD);

  _payload := jsonb_build_object(
    'type', _type,
    'action', _action,
    'record', _record,
    'old_record', _old
  );

  -- Usa net.http_post da extensão pg_net
  SELECT net.http_post(
    url := 'https://fcaxyvptfwnwfctxkqre.supabase.co/functions/v1/sync-post-to-opshub',
    body := _payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18'
    )
  ) INTO _request_id;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_instacena_to_opshub failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$function$;