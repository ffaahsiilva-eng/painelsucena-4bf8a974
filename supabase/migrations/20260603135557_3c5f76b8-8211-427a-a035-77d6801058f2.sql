-- Simplificar as políticas de armazenamento para garantir o funcionamento
DROP POLICY IF EXISTS "Admins and moderators can manage logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete site assets" ON storage.objects;

-- Criar política simplificada para logos
CREATE POLICY "Allow authenticated to manage logos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'site-assets' AND 
  (storage.foldername(name))[1] = 'logos'
)
WITH CHECK (
  bucket_id = 'site-assets' AND 
  (storage.foldername(name))[1] = 'logos'
);

-- Garantir que a leitura continue permitida
DROP POLICY IF EXISTS "Anyone can view site assets" ON storage.objects;
CREATE POLICY "Anyone can view site assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'site-assets');