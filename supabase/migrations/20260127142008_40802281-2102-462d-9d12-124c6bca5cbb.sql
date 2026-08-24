-- Add area column to attendance_report_locks for per-area locking
ALTER TABLE public.attendance_report_locks 
ADD COLUMN area TEXT NOT NULL DEFAULT 'all';

-- Remove the unique constraint on date only
ALTER TABLE public.attendance_report_locks 
DROP CONSTRAINT IF EXISTS attendance_report_locks_date_key;

-- Add new unique constraint for date + area combination
ALTER TABLE public.attendance_report_locks 
ADD CONSTRAINT attendance_report_locks_date_area_key UNIQUE (date, area);