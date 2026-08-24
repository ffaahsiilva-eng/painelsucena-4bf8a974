-- Allow admins to delete records from equipment_stop_history
CREATE POLICY "Admins can delete stop history"
ON public.equipment_stop_history
FOR DELETE
USING (is_admin(auth.uid()));