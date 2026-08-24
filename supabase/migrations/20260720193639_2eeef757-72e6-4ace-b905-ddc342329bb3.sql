CREATE OR REPLACE FUNCTION public.prevent_duplicate_wapi_outbox()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _dedupe_lock text;
  _is_daily_shift boolean;
BEGIN
  -- Identifica Parte Diária por turno: só pode existir uma pendente/processando/enviada.
  _is_daily_shift := (
    NEW.external_id IS NOT NULL
    AND (
      (NEW.origin = 'driver-status' AND NEW.external_kind = 'daily-shift-png-end')
      OR (NEW.origin = 'daily-shift-report' AND NEW.external_kind = 'daily-shift-record')
    )
  );

  -- Preenche uma chave estável quando a origem fornece external_id.
  IF NEW.dedupe_key IS NULL AND NEW.origin IS NOT NULL AND NEW.external_kind IS NOT NULL AND NEW.external_id IS NOT NULL THEN
    NEW.dedupe_key := NEW.origin || '|' || NEW.external_kind || '|' || NEW.external_id::text;
  END IF;

  _dedupe_lock := COALESCE(
    NEW.dedupe_key,
    md5(
      COALESCE(NEW.origin, '') || '|' ||
      COALESCE(NEW.kind, '') || '|' ||
      COALESCE(NEW.target_type, '') || '|' ||
      COALESCE(NEW.phone, '') || '|' ||
      COALESCE(NEW.message, '') || '|' ||
      COALESCE(NEW.caption, '') || '|' ||
      COALESCE(NEW.image_url, '')
    )
  );

  -- Evita corrida entre dois processos tentando enfileirar a mesma mensagem ao mesmo tempo.
  PERFORM pg_advisory_xact_lock(hashtext(_dedupe_lock));

  IF _is_daily_shift AND EXISTS (
    SELECT 1
    FROM public.wapi_outbox o
    WHERE o.id IS DISTINCT FROM NEW.id
      AND o.origin = NEW.origin
      AND o.external_kind = NEW.external_kind
      AND o.external_id = NEW.external_id
      AND o.status IN ('pending', 'processing', 'sent')
  ) THEN
    RETURN NULL;
  END IF;

  IF NEW.dedupe_key IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.wapi_outbox o
    WHERE o.id IS DISTINCT FROM NEW.id
      AND o.origin IS NOT DISTINCT FROM NEW.origin
      AND o.dedupe_key = NEW.dedupe_key
      AND (
        o.status IN ('pending', 'processing')
        OR (o.status = 'sent' AND COALESCE(o.sent_at, o.created_at) > (now() - interval '24 hours'))
      )
  ) THEN
    RETURN NULL;
  END IF;

  -- Proteção final: conteúdo exatamente igual para o mesmo destino não reenfileira no mesmo dia.
  IF EXISTS (
    SELECT 1
    FROM public.wapi_outbox o
    WHERE o.id IS DISTINCT FROM NEW.id
      AND o.phone = NEW.phone
      AND o.target_type = NEW.target_type
      AND o.kind = NEW.kind
      AND (o.message IS NOT DISTINCT FROM NEW.message)
      AND (o.caption IS NOT DISTINCT FROM NEW.caption)
      AND (o.image_url IS NOT DISTINCT FROM NEW.image_url)
      AND (
        o.status IN ('pending', 'processing')
        OR (o.status = 'sent' AND COALESCE(o.sent_at, o.created_at) > (now() - interval '24 hours'))
      )
  ) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE INDEX IF NOT EXISTS idx_wapi_outbox_dedupe_status
ON public.wapi_outbox (origin, dedupe_key, status, created_at DESC)
WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wapi_outbox_daily_shift_guard
ON public.wapi_outbox (origin, external_kind, external_id, status, created_at DESC)
WHERE external_id IS NOT NULL
  AND (
    (origin = 'driver-status' AND external_kind = 'daily-shift-png-end')
    OR (origin = 'daily-shift-report' AND external_kind = 'daily-shift-record')
  );