CREATE TABLE public.aspersores_annotations_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id uuid,
  environment text,
  page integer,
  report_date date,
  data jsonb,
  updated_by uuid,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.aspersores_annotations_history TO authenticated;
GRANT ALL ON public.aspersores_annotations_history TO service_role;

ALTER TABLE public.aspersores_annotations_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read aspersores history"
  ON public.aspersores_annotations_history FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_asp_hist_env_page_at ON public.aspersores_annotations_history (environment, page, snapshot_at DESC);

CREATE OR REPLACE FUNCTION public.snapshot_aspersores_annotations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.data IS DISTINCT FROM NEW.data THEN
    INSERT INTO public.aspersores_annotations_history (annotation_id, environment, page, report_date, data, updated_by)
    VALUES (OLD.id, OLD.environment, OLD.page, OLD.report_date, OLD.data, OLD.updated_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_snapshot_aspersores_annotations
BEFORE UPDATE ON public.aspersores_annotations
FOR EACH ROW EXECUTE FUNCTION public.snapshot_aspersores_annotations();

-- Recupera o relatório completo (04/08) para a data de hoje
INSERT INTO public.aspersores_annotations (environment, page, report_date, data, updated_at)
SELECT environment, 1, '2026-08-18'::date, data, now()
FROM public.aspersores_annotations
WHERE environment = 'barcarena' AND page = 1 AND report_date = '2026-08-04'
ON CONFLICT (environment, report_date, page) DO UPDATE SET data = EXCLUDED.data, updated_at = now();