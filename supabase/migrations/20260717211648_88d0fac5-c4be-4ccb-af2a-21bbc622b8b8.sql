
CREATE INDEX IF NOT EXISTS idx_wapi_outbox_status_scheduled ON public.wapi_outbox(status, scheduled_at) WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS idx_wapi_outbox_created_at ON public.wapi_outbox(created_at);
CREATE INDEX IF NOT EXISTS idx_wapi_outbox_origin_created ON public.wapi_outbox(origin, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_stop_history_eq_created ON public.equipment_stop_history(equipment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_notification_logs_message ON public.chat_notification_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_wapi_broadcasts_created ON public.wapi_broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read_created ON public.chat_messages(read_at, created_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_created ON public.auth_attempts(created_at);
