-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Encarregado Geral can update RDO reports" ON public.rdo_reports;

-- Create new policy that allows Encarregado I and II to update RDO reports as well
CREATE POLICY "Authorized users can update RDO reports" 
ON public.rdo_reports 
FOR UPDATE 
USING (
  is_admin(auth.uid()) OR 
  (EXISTS ( 
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = ANY (ARRAY['encarregado_geral'::cargo_type, 'encarregado_i'::cargo_type, 'encarregado_ii'::cargo_type])
  ))
)
WITH CHECK (
  is_admin(auth.uid()) OR 
  (EXISTS ( 
    SELECT 1
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = ANY (ARRAY['encarregado_geral'::cargo_type, 'encarregado_i'::cargo_type, 'encarregado_ii'::cargo_type])
  ))
);