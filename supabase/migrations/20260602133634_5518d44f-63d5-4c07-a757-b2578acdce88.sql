-- Create a helper function to check for planning management permissions
CREATE OR REPLACE FUNCTION public.can_manage_planning(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    public.is_admin_or_moderator(_user_id) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = _user_id
      AND cargo IN ('planejador', 'engenheiro_planejamento')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins/moderators can insert metas" ON public.planejamento_metas;
DROP POLICY IF EXISTS "Admins/moderators can update metas" ON public.planejamento_metas;

-- Create updated policies
CREATE POLICY "Authorized users can insert metas"
ON public.planejamento_metas
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_planning(auth.uid()));

CREATE POLICY "Authorized users can update metas"
ON public.planejamento_metas
FOR UPDATE
TO authenticated
USING (public.can_manage_planning(auth.uid()))
WITH CHECK (public.can_manage_planning(auth.uid()));
