-- Allow all authenticated users to view all profiles (needed for online users list and chat)
CREATE POLICY "All authenticated users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);