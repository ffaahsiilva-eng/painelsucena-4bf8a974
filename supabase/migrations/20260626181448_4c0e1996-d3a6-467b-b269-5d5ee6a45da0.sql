ALTER TABLE public.backup_jobs
  ADD COLUMN IF NOT EXISTS failed_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS manifest_drive_id text,
  ADD COLUMN IF NOT EXISTS manifest_web_link text;