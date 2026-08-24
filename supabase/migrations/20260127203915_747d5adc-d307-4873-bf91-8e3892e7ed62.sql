-- Drop existing restrictive update policy
DROP POLICY IF EXISTS "Users can update their own RDO reports" ON public.rdo_reports;

-- Create new policy that allows any authenticated user to update RDO reports
CREATE POLICY "Authenticated users can update RDO reports"
ON public.rdo_reports
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);