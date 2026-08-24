
DROP POLICY "Players can update their games" ON public.domino_games;

CREATE POLICY "Players can update their games"
ON public.domino_games
FOR UPDATE
USING (
  auth.uid() = player1_id 
  OR auth.uid() = player2_id 
  OR (status = 'waiting' AND player2_id IS NULL)
);
