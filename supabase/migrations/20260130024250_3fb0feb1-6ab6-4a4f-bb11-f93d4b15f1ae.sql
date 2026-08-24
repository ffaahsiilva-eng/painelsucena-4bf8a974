-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view all overtime records" ON public.overtime_records;

-- Create new SELECT policy: users see their own cargo records OR privileged cargos see all
CREATE POLICY "Users can view overtime records by cargo"
ON public.overtime_records
FOR SELECT
USING (
  -- Privileged cargos can see all records
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo IN ('preposto', 'aux_administrativo', 'encarregado_geral')
  )
  OR
  -- Admins can see all
  is_admin(auth.uid())
  OR
  -- Users can see records from their own cargo
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo::text = overtime_records.cargo
  )
);