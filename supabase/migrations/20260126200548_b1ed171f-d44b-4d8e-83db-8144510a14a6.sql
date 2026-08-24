-- Add session duration column to user_preferences
ALTER TABLE public.user_preferences
ADD COLUMN session_duration_hours integer NOT NULL DEFAULT 5;

-- Add a check constraint to limit values between 1 and 12 hours
ALTER TABLE public.user_preferences
ADD CONSTRAINT session_duration_valid CHECK (session_duration_hours >= 1 AND session_duration_hours <= 12);