CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL DEFAULT public.current_environment(),
  title text NOT NULL,
  description text,
  room_name text NOT NULL UNIQUE,
  scheduled_date date NOT NULL,
  start_time time NOT NULL,
  end_time time,
  participants text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'agendada',
  created_by uuid NOT NULL,
  created_by_name text NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX meetings_env_date_idx ON public.meetings (environment, scheduled_date DESC, start_time DESC);

CREATE TRIGGER meetings_set_environment
BEFORE INSERT ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();

CREATE TRIGGER meetings_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View meetings in current environment"
ON public.meetings FOR SELECT
USING (environment = public.current_environment());

CREATE POLICY "Authenticated users can create meetings"
ON public.meetings FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Owner or admin can update meetings"
ON public.meetings FOR UPDATE
USING (auth.uid() = created_by OR public.is_admin(auth.uid()));

CREATE POLICY "Owner or admin can delete meetings"
ON public.meetings FOR DELETE
USING (auth.uid() = created_by OR public.is_admin(auth.uid()));