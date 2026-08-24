
-- Backup jobs history
CREATE TABLE public.backup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('daily','weekly','monthly','manual','pre_update')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','success','failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  size_bytes bigint,
  file_count integer,
  table_count integer,
  drive_file_id text,
  drive_path text,
  drive_web_view_link text,
  sha256 text,
  error_message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.backup_jobs TO authenticated;
GRANT ALL ON public.backup_jobs TO service_role;

ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage backup_jobs"
ON public.backup_jobs FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER backup_jobs_set_updated_at
BEFORE UPDATE ON public.backup_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log
CREATE TABLE public.backup_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id uuid REFERENCES public.backup_jobs(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('create','download','restore','delete','config')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.backup_audit_log TO authenticated;
GRANT ALL ON public.backup_audit_log TO service_role;

ALTER TABLE public.backup_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit log"
ON public.backup_audit_log FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert audit log"
ON public.backup_audit_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Cron jobs (Pará = UTC-3): diário 02:00 = 05:00 UTC, semanal domingo 03:00 = 06:00 UTC, mensal dia 1 04:00 = 07:00 UTC
SELECT cron.schedule(
  'backup-daily',
  '0 5 * * *',
  $$ select net.http_post(
    url:='https://fcaxyvptfwnwfctxkqre.supabase.co/functions/v1/backup-run',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18"}'::jsonb,
    body:='{"kind":"daily"}'::jsonb
  ); $$
);

SELECT cron.schedule(
  'backup-weekly',
  '0 6 * * 0',
  $$ select net.http_post(
    url:='https://fcaxyvptfwnwfctxkqre.supabase.co/functions/v1/backup-run',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18"}'::jsonb,
    body:='{"kind":"weekly"}'::jsonb
  ); $$
);

SELECT cron.schedule(
  'backup-monthly',
  '0 7 1 * *',
  $$ select net.http_post(
    url:='https://fcaxyvptfwnwfctxkqre.supabase.co/functions/v1/backup-run',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18"}'::jsonb,
    body:='{"kind":"monthly"}'::jsonb
  ); $$
);
