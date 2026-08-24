-- Allow admins to update game_scores
CREATE POLICY "Admins can update game scores"
ON public.game_scores
FOR UPDATE
USING (is_admin(auth.uid()));

-- Allow admins to update checkers_stats
CREATE POLICY "Admins can update checkers stats"
ON public.checkers_stats
FOR UPDATE
USING (is_admin(auth.uid()));

-- Allow admins to update domino_stats
CREATE POLICY "Admins can update domino stats"
ON public.domino_stats
FOR UPDATE
USING (is_admin(auth.uid()));