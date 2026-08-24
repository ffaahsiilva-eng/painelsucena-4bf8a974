CREATE TABLE IF NOT EXISTS public.reminder_notifications_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id uuid NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  scheduled_for_date date NOT NULL,
  occurrence_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipients_count integer NOT NULL DEFAULT 0,
  channel text NOT NULL,
  CONSTRAINT reminder_notifications_sent_unique UNIQUE (reminder_id, scheduled_for_date, occurrence_type)
);

CREATE INDEX IF NOT EXISTS idx_reminder_notif_reminder ON public.reminder_notifications_sent(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_notif_date ON public.reminder_notifications_sent(scheduled_for_date);

ALTER TABLE public.reminder_notifications_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reminder notifications sent"
ON public.reminder_notifications_sent
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));