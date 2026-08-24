-- Add external_work_employee_ids column to attendance_daily_marks
ALTER TABLE public.attendance_daily_marks
ADD COLUMN external_work_employee_ids INTEGER[] DEFAULT '{}';

-- Update GRANTs (just to be sure, though they should persist)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_daily_marks TO authenticated;
GRANT ALL ON public.attendance_daily_marks TO service_role;
