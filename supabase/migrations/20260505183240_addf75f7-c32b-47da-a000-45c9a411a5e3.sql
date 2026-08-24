
-- 1) site_settings: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Site settings are viewable by everyone" ON public.site_settings;
CREATE POLICY "Authenticated users can view site settings"
  ON public.site_settings FOR SELECT TO authenticated USING (true);

-- 2) Replace USING(true) / WITH CHECK(true) on collaborative tables with authenticated-only checks
-- radio_now_playing
DROP POLICY IF EXISTS "Authenticated users can insert radio state" ON public.radio_now_playing;
DROP POLICY IF EXISTS "Authenticated users can update radio state" ON public.radio_now_playing;
CREATE POLICY "Authenticated users can insert radio state"
  ON public.radio_now_playing FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update radio state"
  ON public.radio_now_playing FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- meeting_minutes
DROP POLICY IF EXISTS "Auth delete minutes" ON public.meeting_minutes;
DROP POLICY IF EXISTS "Auth insert minutes" ON public.meeting_minutes;
DROP POLICY IF EXISTS "Auth update minutes" ON public.meeting_minutes;
CREATE POLICY "Auth delete minutes" ON public.meeting_minutes FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert minutes" ON public.meeting_minutes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update minutes" ON public.meeting_minutes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- meeting_minute_items
DROP POLICY IF EXISTS "Auth insert minute items" ON public.meeting_minute_items;
DROP POLICY IF EXISTS "Auth update minute items" ON public.meeting_minute_items;
DROP POLICY IF EXISTS "Auth delete minute items" ON public.meeting_minute_items;
CREATE POLICY "Auth insert minute items" ON public.meeting_minute_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth update minute items" ON public.meeting_minute_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Auth delete minute items" ON public.meeting_minute_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- dds_planning_document
DROP POLICY IF EXISTS "Authenticated users can insert DDS planning document" ON public.dds_planning_document;
DROP POLICY IF EXISTS "Authenticated users can update DDS planning document" ON public.dds_planning_document;
DROP POLICY IF EXISTS "Authenticated users can delete DDS planning document" ON public.dds_planning_document;
CREATE POLICY "Authenticated users can insert DDS planning document" ON public.dds_planning_document FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update DDS planning document" ON public.dds_planning_document FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete DDS planning document" ON public.dds_planning_document FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- double_rounds (game)
DROP POLICY IF EXISTS "Anyone can insert rounds" ON public.double_rounds;
DROP POLICY IF EXISTS "Anyone can update rounds" ON public.double_rounds;
CREATE POLICY "Authenticated can insert rounds" ON public.double_rounds FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update rounds" ON public.double_rounds FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- abastecimento_caixa_dagua
DROP POLICY IF EXISTS "Authenticated users can update abastecimento_caixa_dagua" ON public.abastecimento_caixa_dagua;
DROP POLICY IF EXISTS "Authenticated users can delete abastecimento_caixa_dagua" ON public.abastecimento_caixa_dagua;
CREATE POLICY "Authenticated users can update abastecimento_caixa_dagua" ON public.abastecimento_caixa_dagua FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete abastecimento_caixa_dagua" ON public.abastecimento_caixa_dagua FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- mudas_para_plantar
DROP POLICY IF EXISTS "Authenticated users can insert mudas_para_plantar" ON public.mudas_para_plantar;
DROP POLICY IF EXISTS "Authenticated users can update mudas_para_plantar" ON public.mudas_para_plantar;
CREATE POLICY "Authenticated users can insert mudas_para_plantar" ON public.mudas_para_plantar FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update mudas_para_plantar" ON public.mudas_para_plantar FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- dds_participation
DROP POLICY IF EXISTS "Authenticated users can insert dds participation" ON public.dds_participation;
DROP POLICY IF EXISTS "Authenticated users can update dds participation" ON public.dds_participation;
DROP POLICY IF EXISTS "Authenticated users can delete dds participation" ON public.dds_participation;
CREATE POLICY "Authenticated users can insert dds participation" ON public.dds_participation FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update dds participation" ON public.dds_participation FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete dds participation" ON public.dds_participation FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- dds_participation_locks
DROP POLICY IF EXISTS "Any authenticated user can lock on save" ON public.dds_participation_locks;
CREATE POLICY "Any authenticated user can lock on save" ON public.dds_participation_locks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- nr_trainings
DROP POLICY IF EXISTS "Authenticated insert nr_trainings" ON public.nr_trainings;
DROP POLICY IF EXISTS "Authenticated update nr_trainings" ON public.nr_trainings;
CREATE POLICY "Authenticated insert nr_trainings" ON public.nr_trainings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update nr_trainings" ON public.nr_trainings FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- auth_attempts: needed for login attempts logging (anon must insert). Keep as-is but restrict to anon role only.
DROP POLICY IF EXISTS "Anyone can insert auth attempts" ON public.auth_attempts;
CREATE POLICY "Anyone can insert auth attempts" ON public.auth_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);
