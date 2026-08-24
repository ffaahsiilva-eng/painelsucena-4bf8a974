-- ============================================================
-- INSTACENA STORIES (Status estilo WhatsApp - 24h)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.instacena_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  video_duration_ms INTEGER,
  caption TEXT,
  environment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.instacena_stories (expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_user_created ON public.instacena_stories (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.instacena_story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.instacena_stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewer_name TEXT NOT NULL,
  viewer_avatar TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.instacena_story_views (story_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.instacena_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instacena_story_views ENABLE ROW LEVEL SECURITY;

-- Stories: any authenticated user can view non-expired stories
CREATE POLICY "Authenticated users can view active stories"
ON public.instacena_stories
FOR SELECT
TO authenticated
USING (expires_at > now());

CREATE POLICY "Users can create their own stories"
ON public.instacena_stories
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
ON public.instacena_stories
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Views: viewer can insert their own; story author can read all views; viewer can read own
CREATE POLICY "Users can record their own views"
ON public.instacena_story_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Story author can see all views"
ON public.instacena_story_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.instacena_stories s
    WHERE s.id = instacena_story_views.story_id
      AND s.user_id = auth.uid()
  )
  OR auth.uid() = viewer_id
);

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.instacena_stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.instacena_story_views;

-- ============================================================
-- Auto cleanup of expired stories (every hour)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.instacena_stories WHERE expires_at <= now();
END;
$$;

-- Schedule via pg_cron (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-expired-stories')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-stories');
    PERFORM cron.schedule(
      'cleanup-expired-stories',
      '0 * * * *',
      $cron$ SELECT public.cleanup_expired_stories(); $cron$
    );
  END IF;
END $$;