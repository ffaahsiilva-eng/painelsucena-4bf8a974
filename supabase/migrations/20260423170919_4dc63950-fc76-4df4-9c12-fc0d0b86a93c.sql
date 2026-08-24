CREATE TABLE IF NOT EXISTS public.attendance_area_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id integer NOT NULL,
  employee_name text NOT NULL,
  area text NOT NULL CHECK (area IN ('gabiao', 'jardinagem', 'adm')),
  environment text NOT NULL DEFAULT 'barcarena',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, environment)
);

ALTER TABLE public.attendance_area_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignments in their environment"
  ON public.attendance_area_assignments FOR SELECT TO authenticated
  USING (environment = current_environment());

CREATE POLICY "Authenticated users can insert assignments"
  ON public.attendance_area_assignments FOR INSERT TO authenticated
  WITH CHECK (environment = current_environment());

CREATE POLICY "Authenticated users can update assignments"
  ON public.attendance_area_assignments FOR UPDATE TO authenticated
  USING (environment = current_environment());

CREATE POLICY "Authenticated users can delete assignments"
  ON public.attendance_area_assignments FOR DELETE TO authenticated
  USING (environment = current_environment());

CREATE TRIGGER set_environment_attendance_area_assignments
  BEFORE INSERT ON public.attendance_area_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();

CREATE TRIGGER update_attendance_area_assignments_updated_at
  BEFORE UPDATE ON public.attendance_area_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_area_assignments;