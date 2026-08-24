-- Create training_records table if not exists or ensure columns exist
-- This table will map collaborators to NRs with documents and expiration dates
CREATE TABLE IF NOT EXISTS public.nr_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    environment text NOT NULL,
    collaborator_id uuid REFERENCES public.rh_efetivo(id) ON DELETE CASCADE,
    nr_id uuid REFERENCES public.nr_catalog(id) ON DELETE CASCADE,
    issue_date date,
    expiry_date date,
    document_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(collaborator_id, nr_id)
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr_records TO authenticated;
GRANT ALL ON public.nr_records TO service_role;

-- Enable RLS
ALTER TABLE public.nr_records ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone authenticated can select NR records" ON public.nr_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/Encarregados can manage NR records" ON public.nr_records FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'encarregado')
);
