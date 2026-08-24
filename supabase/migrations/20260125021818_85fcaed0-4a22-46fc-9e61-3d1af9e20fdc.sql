-- Create storage bucket for document files
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-files', 'document-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for document files
CREATE POLICY "Anyone can view document files"
ON storage.objects FOR SELECT
USING (bucket_id = 'document-files');

CREATE POLICY "Authenticated users can upload document files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'document-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update document files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'document-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete document files"
ON storage.objects FOR DELETE
USING (bucket_id = 'document-files' AND auth.uid() IS NOT NULL);