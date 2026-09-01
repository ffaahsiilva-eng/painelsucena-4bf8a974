-- Restaura todas as automações agendadas (pg_cron) que estavam desativadas
CREATE OR REPLACE FUNCTION public.ensure_cron_job(_name text, _schedule text, _command text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _job RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;
  FOR _job IN SELECT jobid FROM cron.job WHERE jobname = _name LOOP
    PERFORM cron.unschedule(_job.jobid);
  END LOOP;
  PERFORM cron.schedule(_name, _schedule, _command);
END $$;

CREATE OR REPLACE FUNCTION public.ensure_edge_cron(_name text, _schedule text, _fn text, _body jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_cron_job(
    _name,
    _schedule,
    format(
      $cmd$select net.http_post(url:='https://fcaxyvptfwnwfctxkqre.supabase.co/functions/v1/%s', headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18"}'::jsonb, body:=%L::jsonb);$cmd$,
      _fn, _body::text
    )
  );
END $$;

-- Worker da fila W-API (essencial: sem ele nenhuma mensagem sai)
SELECT public.ensure_edge_cron('wapi-queue-worker', '* * * * *', 'wapi-queue-worker');

-- Lembretes (a cada 5 min)
SELECT public.ensure_edge_cron('wapi-reminders-notify', '*/5 * * * *', 'wapi-reminders-notify');

-- Diários (horário Pará = UTC-3)
SELECT public.ensure_edge_cron('wapi-aso-notify', '0 9 * * *', 'wapi-aso-notify');
SELECT public.ensure_edge_cron('wapi-desvio-due-notify', '0 9 * * *', 'wapi-desvio-due-notify');
SELECT public.ensure_edge_cron('wapi-dds-notify', '0 9 * * *', 'wapi-dds-notify');
SELECT public.ensure_edge_cron('wapi-forbidden-color-notify', '0 10 * * *', 'wapi-forbidden-color-notify');
SELECT public.ensure_edge_cron('wapi-driver-app-reminder', '0 10 * * 1-6', 'wapi-driver-app-reminder');
SELECT public.ensure_edge_cron('wapi-planned-activities-notify', '0 11 * * *', 'wapi-planned-activities-notify');
SELECT public.ensure_edge_cron('planned-activities-reminder', '0 11 * * *', 'planned-activities-reminder');
SELECT public.ensure_edge_cron('wapi-campaign-notify', '0 12 * * *', 'wapi-campaign-notify');
SELECT public.ensure_edge_cron('wapi-planning-notify', '0 12 * * *', 'wapi-planning-notify');
SELECT public.ensure_edge_cron('wapi-attendance-missing-notify', '0 13 * * 1-5', 'wapi-attendance-missing-notify');
SELECT public.ensure_edge_cron('wapi-matrix-notify', '0 13 * * 4', 'wapi-matrix-notify');
SELECT public.ensure_edge_cron('wapi-shift-end-reminder', '0 20 * * 1-6', 'wapi-shift-end-reminder');

-- Backup diário 00h Pará
SELECT public.ensure_edge_cron('backup-daily-midnight-para', '0 3 * * *', 'backup-run', '{"kind":"daily","created_by":null}'::jsonb);

-- Rotinas internas do banco
SELECT public.ensure_cron_job('check-unread-chat', '*/2 * * * *', 'SELECT public.check_unread_chat_messages()');
SELECT public.ensure_cron_job('cleanup-expired-stories', '0 * * * *', 'SELECT public.cleanup_expired_stories()');