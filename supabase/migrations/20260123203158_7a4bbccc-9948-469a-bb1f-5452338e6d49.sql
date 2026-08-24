-- Add new columns to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS vacation_due_date date,
ADD COLUMN IF NOT EXISTS exam_scheduled date,
ADD COLUMN IF NOT EXISTS nrs text[];