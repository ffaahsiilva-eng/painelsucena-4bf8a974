
-- Update RLS policies for dds_schedule to include tecnico_meio_ambiente
DROP POLICY IF EXISTS "Tecnico seguranca or admin can update DDS schedule" ON public.dds_schedule;
CREATE POLICY "Tecnico seguranca or admin can update DDS schedule"
ON public.dds_schedule
FOR UPDATE
USING (
  is_admin(auth.uid()) OR (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = ANY (ARRAY['tecnico_seguranca_i'::cargo_type, 'tecnico_seguranca_ii'::cargo_type, 'tecnico_meio_ambiente'::cargo_type])
  ))
);

DROP POLICY IF EXISTS "Tecnico seguranca or admin can insert DDS schedule" ON public.dds_schedule;
CREATE POLICY "Tecnico seguranca or admin can insert DDS schedule"
ON public.dds_schedule
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = ANY (ARRAY['tecnico_seguranca_i'::cargo_type, 'tecnico_seguranca_ii'::cargo_type, 'tecnico_meio_ambiente'::cargo_type])
  ))
);

DROP POLICY IF EXISTS "Tecnico seguranca or admin can delete DDS schedule" ON public.dds_schedule;
CREATE POLICY "Tecnico seguranca or admin can delete DDS schedule"
ON public.dds_schedule
FOR DELETE
USING (
  is_admin(auth.uid()) OR (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = ANY (ARRAY['tecnico_seguranca_i'::cargo_type, 'tecnico_seguranca_ii'::cargo_type, 'tecnico_meio_ambiente'::cargo_type])
  ))
);
