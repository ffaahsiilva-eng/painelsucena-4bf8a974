CREATE TABLE IF NOT EXISTS public.matrix_hidden_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id text NOT NULL UNIQUE,
  hidden_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.matrix_hidden_tasks TO authenticated, anon;
GRANT INSERT, DELETE ON public.matrix_hidden_tasks TO authenticated;
GRANT ALL ON public.matrix_hidden_tasks TO service_role;

ALTER TABLE public.matrix_hidden_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read hidden tasks" ON public.matrix_hidden_tasks FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admin insert hidden tasks" ON public.matrix_hidden_tasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete hidden tasks" ON public.matrix_hidden_tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));