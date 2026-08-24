-- Certifica que o bucket site-assets existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas para o bucket site-assets
-- Permite leitura pública
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

-- Permite upload para usuários autenticados
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-assets');

-- Permite atualização/sobrescrita para usuários autenticados
CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'site-assets');

-- Permite exclusão para usuários autenticados
CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site-assets');
