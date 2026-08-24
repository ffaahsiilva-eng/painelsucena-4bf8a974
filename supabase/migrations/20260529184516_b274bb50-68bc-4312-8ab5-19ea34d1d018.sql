-- Adjust equipment_movements policies
DROP POLICY IF EXISTS "Authenticated users can insert equipment movements" ON public.equipment_movements;
CREATE POLICY "Authenticated users can insert equipment movements" 
ON public.equipment_movements 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = created_by 
  AND (environment = current_environment() OR is_admin(auth.uid()))
);

-- Adjust announcements policies
DROP POLICY IF EXISTS "Authenticated users can create announcements" ON public.announcements;
CREATE POLICY "Authenticated users can create announcements" 
ON public.announcements 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = created_by 
  AND (environment = current_environment() OR is_admin(auth.uid()))
);

-- Ensure current_environment() function exists and is stable (it should based on policies)
-- Grant necessary permissions
GRANT INSERT, UPDATE ON public.equipment_movements TO authenticated;
GRANT INSERT ON public.announcements TO authenticated;
GRANT UPDATE ON public.daily_shift_records TO authenticated;
