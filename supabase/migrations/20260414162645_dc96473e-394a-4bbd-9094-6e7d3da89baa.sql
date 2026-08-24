
-- Create music_tracks table
CREATE TABLE public.music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  duration_seconds INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can read music tracks"
  ON public.music_tracks FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert music tracks"
  ON public.music_tracks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update music tracks"
  ON public.music_tracks FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete music tracks"
  ON public.music_tracks FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create storage bucket for music files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('music-files', 'music-files', true, 104857600);

-- Storage policies
CREATE POLICY "Anyone can read music files"
  ON storage.objects FOR SELECT USING (bucket_id = 'music-files');

CREATE POLICY "Admins can upload music files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'music-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update music files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'music-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete music files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'music-files' AND public.is_admin(auth.uid()));

-- Enable realtime for music tracks
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_tracks;
