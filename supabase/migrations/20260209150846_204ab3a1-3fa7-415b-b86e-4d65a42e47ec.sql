-- Allow DDS authorized users (tecnico_seguranca_i, tecnico_seguranca_ii, tecnico_meio_ambiente) to upload DDS photos to site-assets
CREATE POLICY "DDS authorized users can upload dds photos to site-assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'site-assets'
  AND (name LIKE 'dds-%')
  AND (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.cargo = ANY (ARRAY['tecnico_seguranca_i'::cargo_type, 'tecnico_seguranca_ii'::cargo_type, 'tecnico_meio_ambiente'::cargo_type])
    )
  )
);

-- Also allow them to update/delete DDS photos
CREATE POLICY "DDS authorized users can update dds photos in site-assets"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'site-assets'
  AND (name LIKE 'dds-%')
  AND (
    is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.cargo = ANY (ARRAY['tecnico_seguranca_i'::cargo_type, 'tecnico_seguranca_ii'::cargo_type, 'tecnico_meio_ambiente'::cargo_type])
    )
  )
);
