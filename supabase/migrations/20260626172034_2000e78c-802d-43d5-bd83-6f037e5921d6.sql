DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-database-backup') THEN
    PERFORM cron.unschedule('daily-database-backup');
  END IF;
END $$;