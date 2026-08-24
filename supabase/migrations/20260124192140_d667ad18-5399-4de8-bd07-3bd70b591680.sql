-- Add recurring reminder support
-- is_recurring: boolean to indicate if it's a recurring reminder
-- recurring_days: array of integers (0=Sunday, 1=Monday, ..., 6=Saturday)

ALTER TABLE public.reminders 
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_days integer[] DEFAULT '{}';

-- Add a comment explaining the recurring_days format
COMMENT ON COLUMN public.reminders.recurring_days IS 'Array of weekday numbers: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';