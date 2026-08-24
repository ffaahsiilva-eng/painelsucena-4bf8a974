
ALTER TABLE public.meeting_minutes ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'barcarena';
ALTER TABLE public.meeting_minute_items ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'barcarena';

CREATE INDEX IF NOT EXISTS idx_meeting_minutes_env ON public.meeting_minutes(environment);
CREATE INDEX IF NOT EXISTS idx_meeting_minute_items_env ON public.meeting_minute_items(environment);

-- Trigger to populate environment from request header
DROP TRIGGER IF EXISTS set_env_meeting_minutes ON public.meeting_minutes;
CREATE TRIGGER set_env_meeting_minutes
  BEFORE INSERT ON public.meeting_minutes
  FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();

DROP TRIGGER IF EXISTS set_env_meeting_minute_items ON public.meeting_minute_items;
CREATE TRIGGER set_env_meeting_minute_items
  BEFORE INSERT ON public.meeting_minute_items
  FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();
