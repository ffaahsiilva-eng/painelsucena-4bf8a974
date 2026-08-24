
ALTER TABLE public.wapi_outbox
  ADD COLUMN IF NOT EXISTS external_kind text,
  ADD COLUMN IF NOT EXISTS external_id uuid,
  ADD COLUMN IF NOT EXISTS wapi_message_id text;

CREATE INDEX IF NOT EXISTS idx_wapi_outbox_external
  ON public.wapi_outbox (external_kind, external_id)
  WHERE external_id IS NOT NULL;
