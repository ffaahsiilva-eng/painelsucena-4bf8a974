-- Drop existing delete policy and create new one that allows admins to delete any lock
DROP POLICY IF EXISTS "Users can delete their own locks" ON public.attendance_report_locks;

CREATE POLICY "Users can delete their own locks or admins can delete any"
ON public.attendance_report_locks
FOR DELETE
USING (
  auth.uid() = locked_by 
  OR is_admin(auth.uid())
);