
CREATE TABLE IF NOT EXISTS public.meeting_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name text NOT NULL,
  meeting_id uuid NULL,
  meeting_title text NULL,
  environment text NOT NULL DEFAULT 'barcarena',
  transcript text NOT NULL DEFAULT '',
  summary text NULL,
  key_points jsonb NULL,
  action_items jsonb NULL,
  participants text[] NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NULL,
  created_by uuid NOT NULL,
  created_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_room ON public.meeting_transcripts(room_name);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting ON public.meeting_transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_created_by ON public.meeting_transcripts(created_by);

ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meeting transcripts"
  ON public.meeting_transcripts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert their meeting transcripts"
  ON public.meeting_transcripts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors can update their meeting transcripts"
  ON public.meeting_transcripts FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors and admins can delete meeting transcripts"
  ON public.meeting_transcripts FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_meeting_transcripts_updated_at
  BEFORE UPDATE ON public.meeting_transcripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
