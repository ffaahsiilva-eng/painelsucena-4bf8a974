-- Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  alert_days_before INTEGER DEFAULT 0,
  show_on_event_day BOOLEAN DEFAULT true,
  mention_type TEXT NOT NULL CHECK (mention_type IN ('all', 'specific', 'me')),
  mentioned_users UUID[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reminders where they are mentioned, or mention_type is 'all', or they created it
CREATE POLICY "Users can view relevant reminders"
ON public.reminders
FOR SELECT
USING (
  auth.uid() = created_by 
  OR mention_type = 'all' 
  OR auth.uid() = ANY(mentioned_users)
);

-- Policy: Users can create reminders
CREATE POLICY "Users can create reminders"
ON public.reminders
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own reminders
CREATE POLICY "Users can update own reminders"
ON public.reminders
FOR UPDATE
USING (auth.uid() = created_by);

-- Policy: Users can delete their own reminders
CREATE POLICY "Users can delete own reminders"
ON public.reminders
FOR DELETE
USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_reminders_updated_at
BEFORE UPDATE ON public.reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;