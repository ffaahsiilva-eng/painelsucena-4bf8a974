-- Add event_time column to reminders table
ALTER TABLE public.reminders
ADD COLUMN event_time time without time zone DEFAULT NULL;