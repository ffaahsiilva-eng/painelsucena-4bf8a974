
DROP POLICY IF EXISTS "Admins and encarregados can delete attendance" ON public.attendance_records;

CREATE POLICY "Admins and encarregados can delete attendance"
ON public.attendance_records FOR DELETE
USING (
  is_admin(auth.uid()) OR (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = ANY (ARRAY['encarregado_geral'::cargo_type, 'encarregado_i'::cargo_type, 'encarregado_ii'::cargo_type, 'aux_administrativo'::cargo_type])
  ))
);
