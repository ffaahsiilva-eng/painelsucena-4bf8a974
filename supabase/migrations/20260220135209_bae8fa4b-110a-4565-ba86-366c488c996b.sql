
ALTER TABLE public.attendance_records
  DROP CONSTRAINT attendance_records_employee_id_fkey;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
