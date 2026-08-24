-- Update the insertion policy for attendance_report_locks to allow Encarregado I and II to lock any area
DROP POLICY IF EXISTS "Authenticated users can create locks" ON public.attendance_report_locks;

CREATE POLICY "Users can create locks, admins and supervisors too" 
ON public.attendance_report_locks 
FOR INSERT 
WITH CHECK (
  (auth.uid() = locked_by) OR 
  is_admin(auth.uid()) OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('encarregado_geral', 'encarregado_i', 'encarregado_ii')
  ))
);