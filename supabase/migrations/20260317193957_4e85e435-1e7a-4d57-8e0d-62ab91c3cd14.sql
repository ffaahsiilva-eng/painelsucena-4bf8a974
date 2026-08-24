CREATE POLICY "Authenticated users can update mudas_para_plantar"
ON public.mudas_para_plantar
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);