-- Habilita pg_net se ainda não estiver
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Função genérica que envia o evento para a edge function
CREATE OR REPLACE FUNCTION public.sync_instacena_to_opshub()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _type text;
  _action text;
  _record jsonb;
  _old jsonb;
  _payload jsonb;
  _origin text;
BEGIN
  -- Determina tipo conforme tabela
  _type := CASE TG_TABLE_NAME
    WHEN 'instacena_posts' THEN 'post'
    WHEN 'instacena_comments' THEN 'comment'
    WHEN 'instacena_reactions' THEN 'reaction'
    ELSE NULL
  END;
  IF _type IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  _action := TG_OP;

  -- Pega origin do registro relevante para evitar loop
  IF TG_OP = 'DELETE' THEN
    _origin := COALESCE((to_jsonb(OLD) ->> 'origin'), 'local');
  ELSE
    _origin := COALESCE((to_jsonb(NEW) ->> 'origin'), 'local');
  END IF;

  -- Só sincroniza posts LOCAIS (não os que vieram do OpsHub)
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

  PERFORM extensions.http_post(
    url := 'https://fcaxyvptfwnwfctxkqre.supabase.co/functions/v1/sync-post-to-opshub',
    body := _payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18'
    )
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Nunca quebra o INSERT local mesmo se a sync falhar
  RAISE WARNING 'sync_instacena_to_opshub failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers em cada tabela (INSERT e DELETE)
DROP TRIGGER IF EXISTS trg_sync_posts_to_opshub ON public.instacena_posts;
CREATE TRIGGER trg_sync_posts_to_opshub
  AFTER INSERT OR DELETE ON public.instacena_posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_instacena_to_opshub();

DROP TRIGGER IF EXISTS trg_sync_comments_to_opshub ON public.instacena_comments;
CREATE TRIGGER trg_sync_comments_to_opshub
  AFTER INSERT OR DELETE ON public.instacena_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_instacena_to_opshub();

DROP TRIGGER IF EXISTS trg_sync_reactions_to_opshub ON public.instacena_reactions;
CREATE TRIGGER trg_sync_reactions_to_opshub
  AFTER INSERT OR DELETE ON public.instacena_reactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_instacena_to_opshub();