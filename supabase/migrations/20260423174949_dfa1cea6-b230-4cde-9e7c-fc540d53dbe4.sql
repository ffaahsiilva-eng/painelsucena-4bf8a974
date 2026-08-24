-- Persistência das marcações de presença diárias por área (Lista de Presença)
CREATE TABLE IF NOT EXISTS public.attendance_daily_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  area text NOT NULL,
  absent_employee_ids integer[] NOT NULL DEFAULT '{}',
  environment text NOT NULL DEFAULT public.current_environment(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, area, environment)
);

ALTER TABLE public.attendance_daily_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attendance_daily_marks in env"
ON public.attendance_daily_marks FOR SELECT
TO authenticated
USING (environment = public.current_environment());

CREATE POLICY "Authenticated can insert attendance_daily_marks"
ON public.attendance_daily_marks FOR INSERT
TO authenticated
WITH CHECK (environment = public.current_environment());

CREATE POLICY "Authenticated can update attendance_daily_marks"
ON public.attendance_daily_marks FOR UPDATE
TO authenticated
USING (environment = public.current_environment())
WITH CHECK (environment = public.current_environment());

CREATE POLICY "Authenticated can delete attendance_daily_marks"
ON public.attendance_daily_marks FOR DELETE
TO authenticated
USING (environment = public.current_environment());

CREATE TRIGGER set_env_attendance_daily_marks
BEFORE INSERT ON public.attendance_daily_marks
FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();

CREATE TRIGGER touch_attendance_daily_marks
BEFORE UPDATE ON public.attendance_daily_marks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_daily_marks;
ALTER TABLE public.attendance_daily_marks REPLICA IDENTITY FULL;