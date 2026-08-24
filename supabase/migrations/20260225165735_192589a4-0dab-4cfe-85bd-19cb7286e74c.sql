
-- Add player3 and player4 columns to domino_games
ALTER TABLE public.domino_games
  ADD COLUMN player3_id uuid DEFAULT NULL,
  ADD COLUMN player3_name text DEFAULT NULL,
  ADD COLUMN player4_id uuid DEFAULT NULL,
  ADD COLUMN player4_name text DEFAULT NULL,
  ADD COLUMN max_players integer NOT NULL DEFAULT 2;

-- Drop old RLS policies that reference only player1/player2
DROP POLICY IF EXISTS "Players can delete waiting games" ON public.domino_games;
DROP POLICY IF EXISTS "Players can update their games" ON public.domino_games;
DROP POLICY IF EXISTS "Users can see waiting and own games" ON public.domino_games;

-- Recreate policies including player3/player4
CREATE POLICY "Players can delete waiting games"
ON public.domino_games FOR DELETE
USING (auth.uid() = player1_id AND status = 'waiting');

CREATE POLICY "Players can update their games"
ON public.domino_games FOR UPDATE
USING (
  auth.uid() = player1_id OR
  auth.uid() = player2_id OR
  auth.uid() = player3_id OR
  auth.uid() = player4_id OR
  (status = 'waiting' AND (player2_id IS NULL OR player3_id IS NULL OR player4_id IS NULL))
);

CREATE POLICY "Users can see waiting and own games"
ON public.domino_games FOR SELECT
USING (
  status = 'waiting' OR
  auth.uid() = player1_id OR
  auth.uid() = player2_id OR
  auth.uid() = player3_id OR
  auth.uid() = player4_id
);
