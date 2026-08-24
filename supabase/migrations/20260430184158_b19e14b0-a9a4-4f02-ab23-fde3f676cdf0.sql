CREATE POLICY "Authenticated users can delete pos_chuva" 
ON public.pos_chuva_inspections 
FOR DELETE 
TO authenticated 
USING (auth.uid() = created_by);