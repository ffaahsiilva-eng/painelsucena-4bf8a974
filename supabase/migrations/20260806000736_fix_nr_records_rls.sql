
-- Enable RLS
ALTER TABLE public.nr_records ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr_records TO authenticated;
GRANT ALL ON public.nr_records TO service_role;

-- Policies
DROP POLICY IF EXISTS "Users can manage nr_records" ON public.nr_records;
CREATE POLICY "Users can manage nr_records"
ON public.nr_records
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

