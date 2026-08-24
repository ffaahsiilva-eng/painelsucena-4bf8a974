
CREATE TABLE public.desvio_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  desvio_id UUID NOT NULL REFERENCES public.desvios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.desvio_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read desvio comments"
  ON public.desvio_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert desvio comments"
  ON public.desvio_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.desvio_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
