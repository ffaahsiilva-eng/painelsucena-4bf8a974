
-- Create domino games table
CREATE TABLE public.domino_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID NOT NULL,
  player1_name TEXT NOT NULL,
  player2_id UUID,
  player2_name TEXT,
  game_state JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'waiting',
  winner_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.domino_games ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see waiting games and their own games
CREATE POLICY "Users can see waiting and own games"
ON public.domino_games FOR SELECT
USING (status = 'waiting' OR auth.uid() = player1_id OR auth.uid() = player2_id);

-- Users can create games
CREATE POLICY "Users can create games"
ON public.domino_games FOR INSERT
WITH CHECK (auth.uid() = player1_id);

-- Players can update their games
CREATE POLICY "Players can update their games"
ON public.domino_games FOR UPDATE
USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Players can delete their waiting games
CREATE POLICY "Players can delete waiting games"
ON public.domino_games FOR DELETE
USING (auth.uid() = player1_id AND status = 'waiting');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.domino_games;
