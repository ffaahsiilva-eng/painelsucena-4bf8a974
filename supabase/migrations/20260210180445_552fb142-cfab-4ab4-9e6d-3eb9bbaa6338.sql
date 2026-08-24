
-- =====================================================
-- FIX: employees table - restrict all operations to authenticated users
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public insert to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public update to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public delete to employees" ON public.employees;

CREATE POLICY "Authenticated users can view employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert employees"
  ON public.employees FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update employees"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete employees"
  ON public.employees FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- FIX: daily_shift_records - restrict SELECT to authenticated
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view daily shift records" ON public.daily_shift_records;

CREATE POLICY "Authenticated users can view daily shift records"
  ON public.daily_shift_records FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- FIX: attendance_records - restrict all to authenticated
-- =====================================================
DROP POLICY IF EXISTS "Allow public read access to attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow public insert to attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow public update to attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Allow public delete to attendance" ON public.attendance_records;

CREATE POLICY "Authenticated users can view attendance"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert attendance"
  ON public.attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update attendance"
  ON public.attendance_records FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete attendance"
  ON public.attendance_records FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- FIX: inventory_items - restrict SELECT to authenticated
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view inventory items" ON public.inventory_items;

CREATE POLICY "Authenticated users can view inventory items"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- FIX: equipment - restrict SELECT to authenticated
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view equipment" ON public.equipment;

CREATE POLICY "Authenticated users can view equipment"
  ON public.equipment FOR SELECT
  TO authenticated
  USING (true);
