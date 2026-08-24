-- 1) Desativar FORCE RLS (caso esteja ativo)
ALTER TABLE public.instacena_posts     NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.instacena_comments  NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.instacena_reactions NO FORCE ROW LEVEL SECURITY;

-- 2) Criar policies PERMISSIVE catch-all temporárias para destravar inserts
DROP POLICY IF EXISTS "tmp allow all insert" ON public.instacena_posts;
CREATE POLICY "tmp allow all insert" 
  ON public.instacena_posts AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "tmp allow all insert" ON public.instacena_comments;
CREATE POLICY "tmp allow all insert" 
  ON public.instacena_comments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "tmp allow all insert" ON public.instacena_reactions;
CREATE POLICY "tmp allow all insert" 
  ON public.instacena_reactions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);