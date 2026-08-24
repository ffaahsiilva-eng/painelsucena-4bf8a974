-- Fix: Allow authenticated users to insert announcements (needed for order status updates)
-- The existing "Admins can manage announcements" ALL policy blocks non-admin inserts

-- Drop the ALL policy and replace with granular policies
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;

-- Admins can do everything
CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Authenticated users can insert announcements (for order notifications, etc.)
CREATE POLICY "Authenticated users can create announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);