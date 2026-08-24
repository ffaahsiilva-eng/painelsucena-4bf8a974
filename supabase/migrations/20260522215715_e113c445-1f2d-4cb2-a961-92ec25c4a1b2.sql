
DROP POLICY IF EXISTS "Anyone can view report locks" ON public.attendance_report_locks;
CREATE POLICY "Authenticated can view report locks" ON public.attendance_report_locks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read rounds" ON public.aviator_rounds;
CREATE POLICY "Authenticated can read rounds" ON public.aviator_rounds FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view checkers stats" ON public.checkers_stats;
CREATE POLICY "Authenticated can view checkers stats" ON public.checkers_stats FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view DDS planning document" ON public.dds_planning_document;
CREATE POLICY "Authenticated can view DDS planning document" ON public.dds_planning_document FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view DDS schedule" ON public.dds_schedule;
CREATE POLICY "Authenticated can view DDS schedule" ON public.dds_schedule FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view maintenance plan" ON public.equipment_maintenance_plan;
CREATE POLICY "Authenticated can view maintenance plan" ON public.equipment_maintenance_plan FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view stop history" ON public.equipment_stop_history;
CREATE POLICY "Authenticated can view stop history" ON public.equipment_stop_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view game scores" ON public.game_scores;
CREATE POLICY "Authenticated can view game scores" ON public.game_scores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view inventory movements" ON public.inventory_movements;
CREATE POLICY "Authenticated can view inventory movements" ON public.inventory_movements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view jardinagem equipment" ON public.jardinagem_equipment;
CREATE POLICY "Authenticated can view jardinagem equipment" ON public.jardinagem_equipment FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view monthly champions" ON public.monthly_game_champions;
CREATE POLICY "Authenticated can view monthly champions" ON public.monthly_game_champions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view nav visibility rules" ON public.nav_visibility_rules;
CREATE POLICY "Authenticated can view nav visibility rules" ON public.nav_visibility_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view RDO locks" ON public.rdo_report_locks;
CREATE POLICY "Authenticated can view RDO locks" ON public.rdo_report_locks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Authenticated can view site settings" ON public.site_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view storage locations" ON public.storage_locations;
CREATE POLICY "Authenticated can view storage locations" ON public.storage_locations FOR SELECT TO authenticated USING (true);
