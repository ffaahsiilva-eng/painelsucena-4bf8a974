DO $$
DECLARE _job RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;
  FOR _job IN SELECT jobid FROM cron.job WHERE jobname = 'wapi-dds-notify' LOOP
    PERFORM cron.unschedule(_job.jobid);
  END LOOP;
END $$;

-- 09:00 UTC -> 06:00 Pará time
SELECT public.ensure_edge_cron('wapi-dds-notify-today', '0 9 * * *', 'wapi-dds-notify', '{"mode": "today"}'::jsonb);

-- 18:00 UTC -> 15:00 Pará time
SELECT public.ensure_edge_cron('wapi-dds-notify-tomorrow', '0 18 * * *', 'wapi-dds-notify', '{"mode": "tomorrow"}'::jsonb);
