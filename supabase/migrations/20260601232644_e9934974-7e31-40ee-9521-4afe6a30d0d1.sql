-- Create a bucket for database backups
INSERT INTO storage.buckets (id, name, public) 
VALUES ('database-backups', 'database-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for the backups bucket
-- Only service_role can access these files for maximum security
CREATE POLICY "Only service_role can manage backups"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'database-backups')
WITH CHECK (bucket_id = 'database-backups');
