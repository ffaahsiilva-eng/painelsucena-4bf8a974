-- Garantir colunas (idempotente)
ALTER TABLE public.instacena_posts
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_source text;

ALTER TABLE public.instacena_comments
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_source text;

ALTER TABLE public.instacena_reactions
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_source text;

-- Policies para réplicas externas (OpsHub)
DROP POLICY IF EXISTS "OpsHub can insert external posts" ON public.instacena_posts;
CREATE POLICY "OpsHub can insert external posts"
  ON public.instacena_posts FOR INSERT TO anon, authenticated
  WITH CHECK (origin = 'external' AND external_source = 'opshub');

DROP POLICY IF EXISTS "OpsHub can delete its external posts" ON public.instacena_posts;
CREATE POLICY "OpsHub can delete its external posts"
  ON public.instacena_posts FOR DELETE TO anon, authenticated
  USING (origin = 'external' AND external_source = 'opshub');

DROP POLICY IF EXISTS "OpsHub can insert external comments" ON public.instacena_comments;
CREATE POLICY "OpsHub can insert external comments"
  ON public.instacena_comments FOR INSERT TO anon, authenticated
  WITH CHECK (origin = 'external' AND external_source = 'opshub');

DROP POLICY IF EXISTS "OpsHub can delete its external comments" ON public.instacena_comments;
CREATE POLICY "OpsHub can delete its external comments"
  ON public.instacena_comments FOR DELETE TO anon, authenticated
  USING (origin = 'external' AND external_source = 'opshub');

DROP POLICY IF EXISTS "OpsHub can insert external reactions" ON public.instacena_reactions;
CREATE POLICY "OpsHub can insert external reactions"
  ON public.instacena_reactions FOR INSERT TO anon, authenticated
  WITH CHECK (origin = 'external' AND external_source = 'opshub');

DROP POLICY IF EXISTS "OpsHub can update its external reactions" ON public.instacena_reactions;
CREATE POLICY "OpsHub can update its external reactions"
  ON public.instacena_reactions FOR UPDATE TO anon, authenticated
  USING (origin = 'external' AND external_source = 'opshub');

DROP POLICY IF EXISTS "OpsHub can delete its external reactions" ON public.instacena_reactions;
CREATE POLICY "OpsHub can delete its external reactions"
  ON public.instacena_reactions FOR DELETE TO anon, authenticated
  USING (origin = 'external' AND external_source = 'opshub');