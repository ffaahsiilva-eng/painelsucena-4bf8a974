
CREATE INDEX IF NOT EXISTS idx_wapi_outbox_status_scheduled ON public.wapi_outbox (status, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wapi_outbox_created_at ON public.wapi_outbox (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wapi_outbox_origin_created ON public.wapi_outbox (origin, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wapi_outbox_dedupe ON public.wapi_outbox (dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_read ON public.chat_messages (receiver_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_created ON public.chat_messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications (user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_equipment_movements_plate_created ON public.equipment_movements (plate, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_movements_created_at ON public.equipment_movements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_stop_history_equipment_started ON public.equipment_stop_history (equipment_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_desvios_status_created ON public.desvios (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_shift_records_equipment_date ON public.daily_shift_records (equipment_id, shift_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON public.user_presence (last_seen_at DESC);

DELETE FROM public.wapi_outbox WHERE status = 'sent' AND sent_at < now() - interval '30 days';
DELETE FROM public.notifications WHERE read = true AND created_at < now() - interval '60 days';
DELETE FROM public.wapi_message_logs WHERE created_at < now() - interval '60 days';

DO $$
DECLARE _job RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR _job IN SELECT jobid FROM cron.job WHERE jobname IN ('wapi-queue-worker', 'invoke-wapi-queue-worker') LOOP
      PERFORM cron.alter_job(_job.jobid, schedule := '*/2 * * * *');
    END LOOP;
  END IF;
END $$;
