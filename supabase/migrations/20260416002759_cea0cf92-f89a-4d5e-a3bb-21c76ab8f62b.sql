
CREATE TABLE public.radio_now_playing (
  id text PRIMARY KEY DEFAULT 'singleton',
  track_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.radio_now_playing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read radio state"
  ON public.radio_now_playing FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert radio state"
  ON public.radio_now_playing FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update radio state"
  ON public.radio_now_playing FOR UPDATE TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.radio_now_playing;
