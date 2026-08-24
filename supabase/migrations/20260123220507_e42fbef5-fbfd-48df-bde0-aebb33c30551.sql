-- Update DDS schedule policies to allow admins

-- Drop existing policies
DROP POLICY IF EXISTS "Tecnico seguranca can insert DDS schedule" ON public.dds_schedule;
DROP POLICY IF EXISTS "Tecnico seguranca can update DDS schedule" ON public.dds_schedule;
DROP POLICY IF EXISTS "Tecnico seguranca can delete DDS schedule" ON public.dds_schedule;

-- Create new policies that include admins
CREATE POLICY "Tecnico seguranca or admin can insert DDS schedule"
ON public.dds_schedule
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND cargo IN ('tecnico_seguranca_i', 'tecnico_seguranca_ii')
  )
);

CREATE POLICY "Tecnico seguranca or admin can update DDS schedule"
ON public.dds_schedule
FOR UPDATE
USING (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND cargo IN ('tecnico_seguranca_i', 'tecnico_seguranca_ii')
  )
);

CREATE POLICY "Tecnico seguranca or admin can delete DDS schedule"
ON public.dds_schedule
FOR DELETE
USING (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND cargo IN ('tecnico_seguranca_i', 'tecnico_seguranca_ii')
  )
);