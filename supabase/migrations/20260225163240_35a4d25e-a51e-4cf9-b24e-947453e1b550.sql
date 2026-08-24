-- Drop the restrictive update policy
DROP POLICY "Users can update own reminders" ON public.reminders;

-- Create a new policy that allows any authenticated user to update reminders they can see
-- This is needed so users can mark reminders as "Visto" (acknowledged)
CREATE POLICY "Authenticated users can update reminders"
ON public.reminders
FOR UPDATE
USING (
  (auth.uid() = created_by) OR
  (mention_type = 'all') OR
  (auth.uid() = ANY (mentioned_users))
);