
CREATE TABLE IF NOT EXISTS public.planejamento_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL DEFAULT public.current_environment(),
  linha integer,
  categoria text,
  atividade text NOT NULL,
  meta numeric NOT NULL DEFAULT 0,
  realizado numeric NOT NULL DEFAULT 0,
  unidade text,
  display_order integer NOT NULL DEFAULT 0,
  is_section_header boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.planejamento_metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read metas"
  ON public.planejamento_metas FOR SELECT
  TO authenticated
  USING (environment = public.current_environment());

CREATE POLICY "Admins/moderators can insert metas"
  ON public.planejamento_metas FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins/moderators can update metas"
  ON public.planejamento_metas FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_moderator(auth.uid()))
  WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins can delete metas"
  ON public.planejamento_metas FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER set_planejamento_updated_at
  BEFORE UPDATE ON public.planejamento_metas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_planejamento_environment
  BEFORE INSERT ON public.planejamento_metas
  FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();

CREATE INDEX idx_planejamento_metas_env_order ON public.planejamento_metas(environment, display_order);
