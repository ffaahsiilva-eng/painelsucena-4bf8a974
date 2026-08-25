DO $$
DECLARE
  scheduled_job record;
BEGIN
  FOR scheduled_job IN
    SELECT jobname
    FROM cron.job
  LOOP
    PERFORM cron.unschedule(scheduled_job.jobname);
  END LOOP;
END $$;