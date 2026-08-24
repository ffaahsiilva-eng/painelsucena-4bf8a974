-- Permite que usuários marquem comunicados como lidos independente do ambiente atual.
-- A unicidade (announcement_id, user_id) já evita duplicatas; o filtro por ambiente
-- na hora de LER continua valendo via outras policies.
DROP POLICY IF EXISTS "Filter by environment" ON public.announcement_reads;

CREATE POLICY "Filter by environment select"
ON public.announcement_reads
FOR SELECT
USING (environment = current_environment() OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own reads any env"
ON public.announcement_reads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reads any env"
ON public.announcement_reads
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reads any env"
ON public.announcement_reads
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);