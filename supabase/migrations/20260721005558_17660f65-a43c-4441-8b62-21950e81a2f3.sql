
CREATE OR REPLACE FUNCTION public.can_edit_page_customizations(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_moderator(_user_id)
      OR EXISTS (
           SELECT 1 FROM public.profiles
           WHERE id = _user_id AND cargo = 'preposto'
         );
$$;

DROP POLICY IF EXISTS "Admins and moderators can insert customizations" ON public.page_customizations;
DROP POLICY IF EXISTS "Admins and moderators can update customizations" ON public.page_customizations;
DROP POLICY IF EXISTS "Admins and moderators can delete customizations" ON public.page_customizations;

CREATE POLICY "Editors can insert customizations"
ON public.page_customizations FOR INSERT TO authenticated
WITH CHECK (public.can_edit_page_customizations(auth.uid()));

CREATE POLICY "Editors can update customizations"
ON public.page_customizations FOR UPDATE TO authenticated
USING (public.can_edit_page_customizations(auth.uid()));

CREATE POLICY "Editors can delete customizations"
ON public.page_customizations FOR DELETE TO authenticated
USING (public.can_edit_page_customizations(auth.uid()));
