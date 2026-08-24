
-- Create a helper function to check if user can manage employees (admin OR specific cargos)
CREATE OR REPLACE FUNCTION public.can_manage_employees(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND cargo IN ('encarregado_geral', 'encarregado_i', 'encarregado_ii', 'aux_administrativo')
  );
$$;

-- Drop old insert policy and create new one
DROP POLICY IF EXISTS "Admins can insert employees" ON public.employees;
CREATE POLICY "Authorized users can insert employees"
  ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_employees(auth.uid()));
