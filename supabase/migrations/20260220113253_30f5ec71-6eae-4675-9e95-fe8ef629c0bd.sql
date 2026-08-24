
-- Drop the existing admin-only delete policy
DROP POLICY IF EXISTS "Admins can delete attendance" ON public.attendance_records;

-- Create new policy allowing admins AND encarregados to delete attendance records
CREATE POLICY "Admins and encarregados can delete attendance"
ON public.attendance_records
FOR DELETE
TO authenticated
USING (
  is_admin(auth.uid()) OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.cargo = ANY (ARRAY[
        'encarregado_geral'::cargo_type,
        'encarregado_i'::cargo_type,
        'encarregado_ii'::cargo_type
      ])
    )
  )
);
