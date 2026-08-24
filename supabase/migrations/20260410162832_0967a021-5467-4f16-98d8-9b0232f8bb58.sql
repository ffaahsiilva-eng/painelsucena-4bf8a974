CREATE TABLE public.reminder_snoozes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snoozed_until DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reminder_id, user_id)
);

ALTER TABLE public.reminder_snoozes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snoozes"
  ON public.reminder_snoozes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own snoozes"
  ON public.reminder_snoozes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own snoozes"
  ON public.reminder_snoozes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own snoozes"
  ON public.reminder_snoozes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());