
ALTER TABLE public.wapi_config
  ADD COLUMN IF NOT EXISTS auto_send_ata_contrato boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_id_ata_contrato text;

ALTER TABLE public.meeting_minute_items
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE INDEX IF NOT EXISTS idx_mmi_dedupe ON public.meeting_minute_items(dedupe_key);
