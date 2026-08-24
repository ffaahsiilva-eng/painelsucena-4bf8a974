
CREATE TABLE public.meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meeting_date date,
  file_url text,
  raw_text text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meeting_minute_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minute_id uuid NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  item_number text NOT NULL,
  section text,
  description text NOT NULL,
  action_by text,
  deadline text,
  original_status text,
  sort_order integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mmi_minute ON public.meeting_minute_items(minute_id);

ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minute_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view minutes" ON public.meeting_minutes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert minutes" ON public.meeting_minutes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update minutes" ON public.meeting_minutes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete minutes" ON public.meeting_minutes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth view minute items" ON public.meeting_minute_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert minute items" ON public.meeting_minute_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update minute items" ON public.meeting_minute_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete minute items" ON public.meeting_minute_items FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_mm_updated BEFORE UPDATE ON public.meeting_minutes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_mmi_updated BEFORE UPDATE ON public.meeting_minute_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_minute_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_minutes;
