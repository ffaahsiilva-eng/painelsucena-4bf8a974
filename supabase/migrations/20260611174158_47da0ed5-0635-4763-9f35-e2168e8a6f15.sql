ALTER TABLE public.wapi_outbox ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE INDEX IF NOT EXISTS idx_wapi_outbox_dedupe ON public.wapi_outbox(origin, dedupe_key) WHERE dedupe_key IS NOT NULL;