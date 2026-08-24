-- Permitir que admins removam qualquer task completion (não apenas as próprias)
CREATE POLICY "Admins can delete any task completion"
ON public.matrix_task_completions
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Permitir que admins atualizem/insiram em nome do sistema também (para coerência)
CREATE POLICY "Admins can insert any task completion"
ON public.matrix_task_completions
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));