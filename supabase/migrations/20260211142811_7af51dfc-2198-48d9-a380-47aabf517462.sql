-- Update SELECT policy to include engenheiro_planejamento
DROP POLICY "Authorized users can view goals" ON public.goals;
CREATE POLICY "Authorized users can view goals" ON public.goals
FOR SELECT USING (
  is_admin(auth.uid()) OR (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = ANY (ARRAY['planejador'::cargo_type, 'engenheiro_planejamento'::cargo_type, 'encarregado_geral'::cargo_type, 'encarregado_i'::cargo_type, 'encarregado_ii'::cargo_type])
  ))
);

-- Update INSERT policy
DROP POLICY "Authorized users can insert goals" ON public.goals;
CREATE POLICY "Authorized users can insert goals" ON public.goals
FOR INSERT WITH CHECK (
  (auth.uid() = created_by) AND (
    is_admin(auth.uid()) OR (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.cargo = ANY (ARRAY['planejador'::cargo_type, 'engenheiro_planejamento'::cargo_type, 'encarregado_geral'::cargo_type, 'encarregado_i'::cargo_type, 'encarregado_ii'::cargo_type])
    ))
  )
);

-- Update UPDATE policy
DROP POLICY "Authorized users can update goals" ON public.goals;
CREATE POLICY "Authorized users can update goals" ON public.goals
FOR UPDATE USING (
  is_admin(auth.uid()) OR (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = ANY (ARRAY['planejador'::cargo_type, 'engenheiro_planejamento'::cargo_type, 'encarregado_geral'::cargo_type, 'encarregado_i'::cargo_type, 'encarregado_ii'::cargo_type])
  ))
);

-- Update DELETE policy
DROP POLICY "Authorized users can delete goals" ON public.goals;
CREATE POLICY "Authorized users can delete goals" ON public.goals
FOR DELETE USING (
  is_admin(auth.uid()) OR (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = ANY (ARRAY['planejador'::cargo_type, 'engenheiro_planejamento'::cargo_type, 'encarregado_geral'::cargo_type, 'encarregado_i'::cargo_type, 'encarregado_ii'::cargo_type])
  ))
);