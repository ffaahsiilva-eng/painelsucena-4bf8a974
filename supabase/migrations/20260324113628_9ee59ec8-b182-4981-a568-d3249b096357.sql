
CREATE TABLE public.rh_efetivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaboradores jsonb NOT NULL DEFAULT '[]'::jsonb,
  imported_by text NOT NULL DEFAULT '',
  imported_at timestamptz NOT NULL DEFAULT now(),
  deleted_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rh_efetivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rh_efetivo"
  ON public.rh_efetivo FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert rh_efetivo"
  ON public.rh_efetivo FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update rh_efetivo"
  ON public.rh_efetivo FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete rh_efetivo"
  ON public.rh_efetivo FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
