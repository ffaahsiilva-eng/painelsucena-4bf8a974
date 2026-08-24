-- Allow storing absence reasons keyed by RH efetivo matricula (text)
-- instead of strict uuid FK to employees table
ALTER TABLE public.attendance_absence_reasons
  DROP CONSTRAINT IF EXISTS attendance_absence_reasons_employee_id_fkey;

ALTER TABLE public.attendance_absence_reasons
  ALTER COLUMN employee_id TYPE text USING employee_id::text;