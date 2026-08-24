
-- Table to store monthly champions before rankings are reset
CREATE TABLE public.monthly_game_champions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL,
  month_year TEXT NOT NULL, -- format: YYYY-MM
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  avatar_url TEXT,
  score INTEGER NOT NULL DEFAULT 0, -- score for quiz games, wins for board games
  game_type TEXT NOT NULL DEFAULT 'quiz', -- 'quiz' or 'board'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one champion per game per month
ALTER TABLE public.monthly_game_champions 
  ADD CONSTRAINT unique_champion_per_game_month UNIQUE (game_id, month_year);

-- Enable RLS
ALTER TABLE public.monthly_game_champions ENABLE ROW LEVEL SECURITY;

-- Anyone can view champions
CREATE POLICY "Anyone can view monthly champions"
  ON public.monthly_game_champions FOR SELECT
  USING (true);

-- Only service role inserts (via cron), but allow authenticated for edge cases
CREATE POLICY "Authenticated can insert champions"
  ON public.monthly_game_champions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update the cron job to save champions before deleting
SELECT cron.unschedule('reset-game-rankings-monthly');

SELECT cron.schedule(
  'reset-game-rankings-monthly',
  '0 3 1 * *',
  $$
  -- Save quiz champions (best score per game)
  INSERT INTO public.monthly_game_champions (game_id, month_year, user_id, user_name, avatar_url, score, game_type)
  SELECT DISTINCT ON (game_id) 
    game_id,
    to_char(now() - interval '1 day', 'YYYY-MM'),
    user_id,
    user_name,
    avatar_url,
    score,
    'quiz'
  FROM public.game_scores
  ORDER BY game_id, score DESC
  ON CONFLICT (game_id, month_year) DO NOTHING;

  -- Save checkers champion
  INSERT INTO public.monthly_game_champions (game_id, month_year, user_id, user_name, avatar_url, score, game_type)
  SELECT 
    'checkers',
    to_char(now() - interval '1 day', 'YYYY-MM'),
    user_id,
    user_name,
    avatar_url,
    wins,
    'board'
  FROM public.checkers_stats
  ORDER BY wins DESC
  LIMIT 1
  ON CONFLICT (game_id, month_year) DO NOTHING;

  -- Save domino champion
  INSERT INTO public.monthly_game_champions (game_id, month_year, user_id, user_name, avatar_url, score, game_type)
  SELECT 
    'domino',
    to_char(now() - interval '1 day', 'YYYY-MM'),
    user_id,
    user_name,
    NULL,
    wins,
    'board'
  FROM public.domino_stats
  ORDER BY wins DESC
  LIMIT 1
  ON CONFLICT (game_id, month_year) DO NOTHING;

  -- Now reset
  DELETE FROM public.game_scores;
  DELETE FROM public.checkers_stats;
  DELETE FROM public.domino_stats;
  $$
);
