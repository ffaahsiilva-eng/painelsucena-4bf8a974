-- Add acknowledged_by column to track users who have seen the reminder
ALTER TABLE public.reminders 
ADD COLUMN acknowledged_by uuid[] DEFAULT '{}'::uuid[];

-- Add comment for documentation
COMMENT ON COLUMN public.reminders.acknowledged_by IS 'Array of user IDs who have acknowledged/seen this reminder';