CREATE TABLE IF NOT EXISTS public.matrix_custom_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_id text NOT NULL,
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_matrix_custom_tasks_cargo ON public.matrix_custom_tasks(cargo_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matrix_custom_tasks TO authenticated;
GRANT ALL ON public.matrix_custom_tasks TO service_role;
ALTER TABLE public.matrix_custom_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matrix_custom_tasks_select_auth" ON public.matrix_custom_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "matrix_custom_tasks_insert_auth" ON public.matrix_custom_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "matrix_custom_tasks_delete_own_or_admin" ON public.matrix_custom_tasks FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
CREATE POLICY "matrix_custom_tasks_update_own_or_admin" ON public.matrix_custom_tasks FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));