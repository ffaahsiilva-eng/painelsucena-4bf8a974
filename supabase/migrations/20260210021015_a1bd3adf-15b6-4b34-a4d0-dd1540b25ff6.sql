
DROP POLICY "Admins can insert schedule" ON public.site_inspection_schedule;
DROP POLICY "Admins can update schedule" ON public.site_inspection_schedule;
DROP POLICY "Admins can delete schedule" ON public.site_inspection_schedule;

CREATE POLICY "Authorized users can insert schedule"
  ON public.site_inspection_schedule FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.cargo IN ('tecnico_seguranca_i', 'tecnico_seguranca_ii', 'preposto')
    )
  );

CREATE POLICY "Authorized users can update schedule"
  ON public.site_inspection_schedule FOR UPDATE
  USING (
    is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.cargo IN ('tecnico_seguranca_i', 'tecnico_seguranca_ii', 'preposto')
    )
  );

CREATE POLICY "Authorized users can delete schedule"
  ON public.site_inspection_schedule FOR DELETE
  USING (
    is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.cargo IN ('tecnico_seguranca_i', 'tecnico_seguranca_ii', 'preposto')
    )
  );
