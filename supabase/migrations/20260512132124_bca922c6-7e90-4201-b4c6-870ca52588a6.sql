-- Revise policies for attendance_area_assignments
DROP POLICY IF EXISTS "Authenticated users can insert assignments" ON public.attendance_area_assignments;
DROP POLICY IF EXISTS "Authenticated users can update assignments" ON public.attendance_area_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete assignments" ON public.attendance_area_assignments;

CREATE POLICY "Admins and supervisors can manage area assignments" 
ON public.attendance_area_assignments 
FOR ALL 
TO authenticated 
USING (
  is_admin(auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('encarregado_geral', 'encarregado_i', 'encarregado_ii')
  ))
)
WITH CHECK (
  is_admin(auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('encarregado_geral', 'encarregado_i', 'encarregado_ii')
  ))
);

-- Revise policies for attendance_daily_marks
DROP POLICY IF EXISTS "Authenticated can insert attendance_daily_marks" ON public.attendance_daily_marks;
DROP POLICY IF EXISTS "Authenticated can update attendance_daily_marks" ON public.attendance_daily_marks;
DROP POLICY IF EXISTS "Authenticated can delete attendance_daily_marks" ON public.attendance_daily_marks;

CREATE POLICY "Admins and supervisors can manage attendance marks" 
ON public.attendance_daily_marks 
FOR ALL 
TO authenticated 
USING (
  is_admin(auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('encarregado_geral', 'encarregado_i', 'encarregado_ii')
  ))
)
WITH CHECK (
  is_admin(auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('encarregado_geral', 'encarregado_i', 'encarregado_ii')
  ))
);