-- Garantir que as permissões de RLS permitam o acesso necessário
-- Como o bucket agora é privado por restrição do workspace, 
-- precisamos que as políticas SELECT incluam usuários autenticados.

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;

CREATE POLICY "Allow authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'site-assets');

-- As políticas de INSERT/UPDATE/DELETE já estão corretas para 'authenticated'.
