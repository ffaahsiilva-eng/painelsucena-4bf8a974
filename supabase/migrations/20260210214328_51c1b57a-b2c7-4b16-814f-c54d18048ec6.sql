
-- Table to track domino game stats (online matches only)
CREATE TABLE public.domino_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.domino_stats ENABLE ROW LEVEL SECURITY;

-- Everyone can read the ranking
CREATE POLICY "Anyone can view domino stats"
  ON public.domino_stats FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own stats
CREATE POLICY "Users can insert own stats"
  ON public.domino_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own stats
CREATE POLICY "Users can update own stats"
  ON public.domino_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for live ranking updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.domino_stats;
