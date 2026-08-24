
-- Create game_scores table to track best scores for all quiz games
CREATE TABLE public.game_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  avatar_url TEXT,
  game_id TEXT NOT NULL, -- 'recycling', 'epi', 'rocagem', 'gabiao'
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast ranking queries per game
CREATE INDEX idx_game_scores_game_id_score ON public.game_scores (game_id, score DESC);
CREATE INDEX idx_game_scores_user_game ON public.game_scores (user_id, game_id);

-- Enable RLS
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view scores (for ranking)
CREATE POLICY "Anyone can view game scores"
ON public.game_scores FOR SELECT
USING (true);

-- Users can insert their own scores
CREATE POLICY "Users can insert own scores"
ON public.game_scores FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scores
CREATE POLICY "Users can update own scores"
ON public.game_scores FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for live ranking updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_scores;
