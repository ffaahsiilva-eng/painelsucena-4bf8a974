DROP POLICY IF EXISTS "Users can delete their own locks or admins can delete any" ON public.attendance_report_locks;

CREATE POLICY "Users own locks, admins or encarregados can delete any"
ON public.attendance_report_locks
FOR DELETE
USING (
  auth.uid() = locked_by
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND cargo IN ('encarregado_geral', 'encarregado_i', 'encarregado_ii')
  )
);