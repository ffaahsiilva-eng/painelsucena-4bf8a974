
-- Posts table for InstaCena feed
CREATE TABLE public.instacena_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar_url TEXT,
  content TEXT,
  image_urls TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.instacena_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view posts" ON public.instacena_posts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create their own posts" ON public.instacena_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.instacena_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts or admins" ON public.instacena_posts FOR DELETE USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Comments table
CREATE TABLE public.instacena_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.instacena_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.instacena_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view comments" ON public.instacena_comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create their own comments" ON public.instacena_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments or admins" ON public.instacena_comments FOR DELETE USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Reactions table (like, love, haha, wow, sad, angry)
CREATE TABLE public.instacena_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.instacena_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.instacena_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view reactions" ON public.instacena_reactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create their own reactions" ON public.instacena_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reactions" ON public.instacena_reactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reactions" ON public.instacena_reactions FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for all InstaCena tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.instacena_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.instacena_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.instacena_reactions;
