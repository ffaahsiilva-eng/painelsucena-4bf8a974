
ALTER TABLE public.meeting_transcripts
  ADD COLUMN IF NOT EXISTS snapshots text[] NOT NULL DEFAULT '{}'::text[];

INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-snapshots', 'meeting-snapshots', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read meeting snapshots" ON storage.objects;
CREATE POLICY "Public read meeting snapshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'meeting-snapshots');

DROP POLICY IF EXISTS "Authenticated upload meeting snapshots" ON storage.objects;
CREATE POLICY "Authenticated upload meeting snapshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'meeting-snapshots');

DROP POLICY IF EXISTS "Owners update meeting snapshots" ON storage.objects;
CREATE POLICY "Owners update meeting snapshots"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'meeting-snapshots' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'meeting-snapshots' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Owners delete meeting snapshots" ON storage.objects;
CREATE POLICY "Owners delete meeting snapshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'meeting-snapshots' AND auth.uid() = owner);
