-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own task completions" ON public.matrix_task_completions;

-- Create new policy allowing all authenticated users to view all completions
CREATE POLICY "All authenticated users can view task completions" 
ON public.matrix_task_completions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);