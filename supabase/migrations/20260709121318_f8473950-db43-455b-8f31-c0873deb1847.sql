
SELECT cron.alter_job(21, schedule => '*/2 * * * *');
SELECT cron.alter_job(28, schedule => '*/5 * * * *');
SELECT cron.alter_job(15, schedule => '*/15 * * * *');

DELETE FROM public.wapi_outbox
  WHERE status IN ('sent','failed')
    AND created_at < now() - interval '30 days';

DELETE FROM public.notifications
  WHERE read = true
    AND created_at < now() - interval '60 days';

ANALYZE public.wapi_outbox;
ANALYZE public.notifications;
ANALYZE public.equipment_movements;
ANALYZE public.daily_shift_records;
ANALYZE public.chat_messages;
ANALYZE public.desvios;
