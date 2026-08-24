-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Create a new policy that allows all authenticated users to view admin roles
-- This is needed so all users can see the verified badge on admin users
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);