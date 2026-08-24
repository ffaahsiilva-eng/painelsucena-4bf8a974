CREATE OR REPLACE FUNCTION public.prevent_duplicate_wapi_outbox()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    -- Se tem dedupe_key, prioriza o check por ele (mais preciso para eventos lógicos)
    IF NEW.dedupe_key IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.wapi_outbox
            WHERE dedupe_key = NEW.dedupe_key
              AND (
                status IN ('pending', 'processing')
                OR (status = 'sent' AND sent_at > (now() - interval '60 seconds'))
              )
        ) THEN
            RETURN NULL;
        END IF;
    END IF;

    -- Fallback: Check por conteúdo idêntico para o mesmo destinatário (para casos sem dedupe_key)
    IF EXISTS (
        SELECT 1 FROM public.wapi_outbox
        WHERE phone = NEW.phone
          AND (message IS NOT DISTINCT FROM NEW.message)
          AND (caption IS NOT DISTINCT FROM NEW.caption)
          AND (image_url IS NOT DISTINCT FROM NEW.image_url)
          AND (
            status IN ('pending', 'processing')
            OR (status = 'sent' AND sent_at > (now() - interval '60 seconds'))
          )
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RETURN NULL;
    END IF;

    RETURN NEW;
END;
$function$;