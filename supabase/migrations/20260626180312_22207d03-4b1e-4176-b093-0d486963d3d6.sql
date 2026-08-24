
ALTER TABLE public.backup_jobs
  ADD COLUMN IF NOT EXISTS include_storage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS drive_root_id text,
  ADD COLUMN IF NOT EXISTS drive_folder_id text,
  ADD COLUMN IF NOT EXISTS stamp text,
  ADD COLUMN IF NOT EXISTS pending_buckets jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS uploaded_segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'db',
  ADD COLUMN IF NOT EXISTS last_progress_at timestamptz;
