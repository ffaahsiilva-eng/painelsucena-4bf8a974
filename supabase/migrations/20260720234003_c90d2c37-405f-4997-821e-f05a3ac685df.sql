-- Helper: verifica se usuário pode gerenciar atividades customizadas do RDO
CREATE OR REPLACE FUNCTION public.can_manage_custom_activities(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = _user_id
        AND cargo IN ('preposto', 'encarregado_geral', 'encarregado_i', 'encarregado_ii')
    );
$$;

-- 1) Definições das atividades
CREATE TABLE public.custom_activity_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment text NOT NULL DEFAULT public.current_environment(),
  title text NOT NULL,
  icon text NOT NULL DEFAULT 'Sparkles',
  color text NOT NULL DEFAULT 'amber',
  order_index integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{"fields": []}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_activity_definitions TO authenticated;
GRANT ALL ON public.custom_activity_definitions TO service_role;

ALTER TABLE public.custom_activity_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Custom activities visible per environment"
ON public.custom_activity_definitions
FOR SELECT
TO authenticated
USING (public.has_environment_access(auth.uid(), environment));

CREATE POLICY "Custom activities insert by managers"
ON public.custom_activity_definitions
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_custom_activities(auth.uid()));

CREATE POLICY "Custom activities update by managers"
ON public.custom_activity_definitions
FOR UPDATE
TO authenticated
USING (public.can_manage_custom_activities(auth.uid()))
WITH CHECK (public.can_manage_custom_activities(auth.uid()));

CREATE POLICY "Custom activities delete by managers"
ON public.custom_activity_definitions
FOR DELETE
TO authenticated
USING (public.can_manage_custom_activities(auth.uid()));

CREATE TRIGGER trg_custom_activity_definitions_updated_at
BEFORE UPDATE ON public.custom_activity_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_custom_activity_definitions_set_env
BEFORE INSERT ON public.custom_activity_definitions
FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();

CREATE INDEX idx_custom_activity_definitions_env_order
ON public.custom_activity_definitions (environment, order_index);

-- 2) Preenchimentos diários
CREATE TABLE public.custom_activity_daily_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment text NOT NULL DEFAULT public.current_environment(),
  definition_id uuid NOT NULL REFERENCES public.custom_activity_definitions(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  locked boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_activity_daily_reports_unique UNIQUE (definition_id, report_date, environment)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_activity_daily_reports TO authenticated;
GRANT ALL ON public.custom_activity_daily_reports TO service_role;

ALTER TABLE public.custom_activity_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Custom activity reports visible per environment"
ON public.custom_activity_daily_reports
FOR SELECT
TO authenticated
USING (public.has_environment_access(auth.uid(), environment));

CREATE POLICY "Custom activity reports insert by managers"
ON public.custom_activity_daily_reports
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_custom_activities(auth.uid()));

CREATE POLICY "Custom activity reports update by managers"
ON public.custom_activity_daily_reports
FOR UPDATE
TO authenticated
USING (public.can_manage_custom_activities(auth.uid()))
WITH CHECK (public.can_manage_custom_activities(auth.uid()));

CREATE POLICY "Custom activity reports delete by managers"
ON public.custom_activity_daily_reports
FOR DELETE
TO authenticated
USING (public.can_manage_custom_activities(auth.uid()));

CREATE TRIGGER trg_custom_activity_daily_reports_updated_at
BEFORE UPDATE ON public.custom_activity_daily_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_custom_activity_daily_reports_set_env
BEFORE INSERT ON public.custom_activity_daily_reports
FOR EACH ROW EXECUTE FUNCTION public.set_environment_on_insert();

CREATE INDEX idx_custom_activity_daily_reports_lookup
ON public.custom_activity_daily_reports (environment, report_date, definition_id);
