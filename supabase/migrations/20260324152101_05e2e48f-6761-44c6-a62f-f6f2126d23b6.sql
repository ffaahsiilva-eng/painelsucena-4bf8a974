-- Allow administrativo in employees area check constraint
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_area_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_area_check
  CHECK (area = ANY (ARRAY['gabiao'::text, 'jardinagem'::text, 'administrativo'::text]));