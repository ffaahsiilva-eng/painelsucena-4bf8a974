
-- Allow aux_administrativo to also write to rh_efetivo
DROP POLICY "Admins can insert rh_efetivo" ON public.rh_efetivo;
DROP POLICY "Admins can update rh_efetivo" ON public.rh_efetivo;
DROP POLICY "Admins can delete rh_efetivo" ON public.rh_efetivo;

CREATE POLICY "RH editors can insert rh_efetivo"
  ON public.rh_efetivo FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND cargo = 'aux_administrativo')
  );

CREATE POLICY "RH editors can update rh_efetivo"
  ON public.rh_efetivo FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND cargo = 'aux_administrativo')
  );

CREATE POLICY "RH editors can delete rh_efetivo"
  ON public.rh_efetivo FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND cargo = 'aux_administrativo')
  );
