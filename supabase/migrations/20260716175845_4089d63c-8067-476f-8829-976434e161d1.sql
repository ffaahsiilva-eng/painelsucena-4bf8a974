
-- 1) Audit table
CREATE TABLE IF NOT EXISTS public.sling_inspection_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.sling_inspections(id) ON DELETE CASCADE,
  sling_id uuid NOT NULL REFERENCES public.sling_equipment(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('created','updated','deleted')),
  field text,
  old_value text,
  new_value text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.sling_inspection_audit TO authenticated;
GRANT ALL ON public.sling_inspection_audit TO service_role;

ALTER TABLE public.sling_inspection_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view audit" ON public.sling_inspection_audit;
CREATE POLICY "Authenticated can view audit"
  ON public.sling_inspection_audit
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "System can insert audit" ON public.sling_inspection_audit;
CREATE POLICY "System can insert audit"
  ON public.sling_inspection_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS sling_inspection_audit_sling_idx ON public.sling_inspection_audit(sling_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sling_inspection_audit_inspection_idx ON public.sling_inspection_audit(inspection_id, created_at DESC);

-- 2) Trigger function
CREATE OR REPLACE FUNCTION public.audit_sling_inspection_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sling_inspection_audit(inspection_id, sling_id, action, field, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.sling_id, 'created', 'status', NULL, NEW.status, _actor);

    IF NEW.inspected_at IS NOT NULL THEN
      INSERT INTO public.sling_inspection_audit(inspection_id, sling_id, action, field, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.sling_id, 'created', 'inspected_at', NULL, NEW.inspected_at::text, _actor);
    END IF;

    IF NEW.photo_url IS NOT NULL THEN
      INSERT INTO public.sling_inspection_audit(inspection_id, sling_id, action, field, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.sling_id, 'created', 'photo_url', NULL, NEW.photo_url, _actor);
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.sling_inspection_audit(inspection_id, sling_id, action, field, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.sling_id, 'updated', 'status', OLD.status, NEW.status, _actor);
    END IF;

    IF NEW.inspected_at IS DISTINCT FROM OLD.inspected_at THEN
      INSERT INTO public.sling_inspection_audit(inspection_id, sling_id, action, field, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.sling_id, 'updated', 'inspected_at', OLD.inspected_at::text, NEW.inspected_at::text, _actor);
    END IF;

    IF NEW.photo_url IS DISTINCT FROM OLD.photo_url THEN
      INSERT INTO public.sling_inspection_audit(inspection_id, sling_id, action, field, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.sling_id, 'updated', 'photo_url', OLD.photo_url, NEW.photo_url, _actor);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_sling_inspection ON public.sling_inspections;
CREATE TRIGGER trg_audit_sling_inspection
AFTER INSERT OR UPDATE ON public.sling_inspections
FOR EACH ROW EXECUTE FUNCTION public.audit_sling_inspection_changes();
