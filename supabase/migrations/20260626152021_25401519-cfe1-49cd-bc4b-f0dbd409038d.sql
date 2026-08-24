
DO $$
DECLARE j RECORD;
BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname LIKE 'backup-%' LOOP
    PERFORM cron.unschedule(j.jobname);
  END LOOP;
END $$;

SELECT cron.schedule(
  'backup-daily-midnight-para',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fcaxyvptfwnwfctxkqre.supabase.co/functions/v1/backup-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYXh5dnB0Zndud2ZjdHhrcXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTEwMjksImV4cCI6MjA4NDc2NzAyOX0.-F69aRxjeGnfSKKnnkJ3_2U0FLRrPGo9DOU-tnGjG18'
    ),
    body := jsonb_build_object('kind', 'daily', 'created_by', null)
  );
  $$
);
