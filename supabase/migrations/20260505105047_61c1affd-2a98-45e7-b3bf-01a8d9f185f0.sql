-- Fix RLS for reminder_notifications_sent to allow creators to delete notifications for their reminders
CREATE POLICY "Creators can delete sent notifications for their reminders"
ON public.reminder_notifications_sent
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.reminders 
    WHERE public.reminders.id = reminder_id 
    AND public.reminders.created_by = auth.uid()
  )
);

-- Fix RLS for reminder_snoozes to allow creators to manage snoozes for their reminders (collective snooze)
CREATE POLICY "Creators can manage snoozes for their reminders"
ON public.reminder_snoozes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.reminders 
    WHERE public.reminders.id = reminder_id 
    AND public.reminders.created_by = auth.uid()
  )
);

-- Ensure environment is always checked in reminder_snoozes (if not already handled by restrictive policy)
-- The existing 'Filter by environment' RESTRICTIVE policy already handles this.
