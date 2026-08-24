-- Enable storage policies for the 'documents' bucket
-- These policies allow authenticated users to manage files in the 'documents' bucket

-- 1. Allow authenticated users to upload files
CREATE POLICY "Allow authenticated upload" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'documents');

-- 2. Allow authenticated users to view files
CREATE POLICY "Allow authenticated select" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (bucket_id = 'documents');

-- 3. Allow authenticated users to update files (required for overwrites or metadata)
CREATE POLICY "Allow authenticated update" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'documents');

-- 4. Allow authenticated users to delete files
CREATE POLICY "Allow authenticated delete" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'documents');
