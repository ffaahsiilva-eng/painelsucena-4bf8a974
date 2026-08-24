CREATE POLICY "Admins can update any balance"
ON public.double_balances
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert any balance"
ON public.double_balances
FOR INSERT
WITH CHECK (is_admin(auth.uid()));