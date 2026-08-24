CREATE TABLE IF NOT EXISTS public.aspersores_consertos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment TEXT NOT NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    count INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    created_by_name TEXT
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.aspersores_consertos TO authenticated;
GRANT ALL ON public.aspersores_consertos TO service_role;

ALTER TABLE public.aspersores_consertos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all actions for authenticated users"
ON public.aspersores_consertos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
