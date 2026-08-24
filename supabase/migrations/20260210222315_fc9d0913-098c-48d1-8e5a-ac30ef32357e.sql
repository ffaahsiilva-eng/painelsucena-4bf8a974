
-- Table for online checkers games
CREATE TABLE public.checkers_games (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id uuid NOT NULL,
  player1_name text NOT NULL,
  player1_avatar_url text,
  player2_id uuid,
  player2_name text,
  player2_avatar_url text,
  board jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_turn text NOT NULL DEFAULT 'white',
  status text NOT NULL DEFAULT 'waiting',
  winner_id uuid,
  player1_color text NOT NULL DEFAULT 'white',
  player1_piece_style jsonb DEFAULT '{}'::jsonb,
  player2_piece_style jsonb DEFAULT '{}'::jsonb,
  captured_white integer NOT NULL DEFAULT 0,
  captured_black integer NOT NULL DEFAULT 0,
  last_move jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.checkers_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see waiting and own games"
  ON public.checkers_games FOR SELECT
  USING (status = 'waiting' OR auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Users can create games"
  ON public.checkers_games FOR INSERT
  WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Players can update their games"
  ON public.checkers_games FOR UPDATE
  USING (auth.uid() = player1_id OR auth.uid() = player2_id OR (status = 'waiting' AND player2_id IS NULL));

CREATE POLICY "Players can delete waiting games"
  ON public.checkers_games FOR DELETE
  USING (auth.uid() = player1_id AND status = 'waiting');

-- Enable realtime for online games
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkers_games;

-- Table for checkers ranking (online only)
CREATE TABLE public.checkers_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  user_name text NOT NULL,
  avatar_url text,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.checkers_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view checkers stats"
  ON public.checkers_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own stats"
  ON public.checkers_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.checkers_stats FOR UPDATE
  USING (auth.uid() = user_id);
