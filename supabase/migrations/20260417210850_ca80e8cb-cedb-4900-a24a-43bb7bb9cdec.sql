-- Permite que admins criem comunicados para qualquer ambiente,
-- mantendo o filtro por ambiente para usuários comuns.
DROP POLICY IF EXISTS "Filter by environment" ON public.announcements;

CREATE POLICY "Filter by environment select"
ON public.announcements
FOR SELECT
USING (environment = public.current_environment() OR public.is_admin(auth.uid()));

CREATE POLICY "Filter by environment modify"
ON public.announcements
FOR ALL
USING (environment = public.current_environment() OR public.is_admin(auth.uid()))
WITH CHECK (environment = public.current_environment() OR public.is_admin(auth.uid()));