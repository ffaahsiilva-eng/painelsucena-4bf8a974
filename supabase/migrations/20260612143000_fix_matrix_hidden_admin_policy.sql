DROP POLICY IF EXISTS "admin insert hidden tasks" ON public.matrix_hidden_tasks;
DROP POLICY IF EXISTS "admin delete hidden tasks" ON public.matrix_hidden_tasks;

CREATE POLICY "admin insert hidden tasks"
ON public.matrix_hidden_tasks
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin delete hidden tasks"
ON public.matrix_hidden_tasks
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
