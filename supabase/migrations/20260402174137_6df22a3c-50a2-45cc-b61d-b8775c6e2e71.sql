-- Create is_admin_or_moderator function
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- Create page_customizations table for inline CMS editing
CREATE TABLE public.page_customizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL,
  element_key TEXT NOT NULL,
  element_type TEXT NOT NULL DEFAULT 'text',
  text_value TEXT,
  image_url TEXT,
  color_value TEXT,
  metadata JSONB,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_key, element_key)
);

ALTER TABLE public.page_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customizations"
ON public.page_customizations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and moderators can insert customizations"
ON public.page_customizations FOR INSERT TO authenticated
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can update customizations"
ON public.page_customizations FOR UPDATE TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

CREATE POLICY "Admins and moderators can delete customizations"
ON public.page_customizations FOR DELETE TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

CREATE TRIGGER update_page_customizations_updated_at
BEFORE UPDATE ON public.page_customizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();