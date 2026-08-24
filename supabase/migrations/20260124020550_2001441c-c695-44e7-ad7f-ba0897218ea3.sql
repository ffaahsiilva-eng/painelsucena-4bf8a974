-- Create reminder_history table to track actions on reminders
CREATE TABLE public.reminder_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL,
  reminder_title text NOT NULL,
  reminder_description text,
  event_date date NOT NULL,
  action text NOT NULL CHECK (action IN ('acknowledged', 'cancelled')),
  action_by uuid NOT NULL,
  original_created_by uuid NOT NULL,
  mention_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminder_history ENABLE ROW LEVEL SECURITY;

-- Users can view history of reminders they created or were mentioned in
CREATE POLICY "Users can view relevant reminder history"
ON public.reminder_history
FOR SELECT
USING (
  auth.uid() = action_by OR 
  auth.uid() = original_created_by OR 
  mention_type = 'all'
);

-- Authenticated users can insert history records
CREATE POLICY "Authenticated users can create history"
ON public.reminder_history
FOR INSERT
WITH CHECK (auth.uid() = action_by);

-- Add comment for documentation
COMMENT ON TABLE public.reminder_history IS 'Tracks acknowledged and cancelled reminders for historical reference';