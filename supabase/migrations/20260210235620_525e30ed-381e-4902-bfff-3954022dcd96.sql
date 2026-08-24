
-- Add columns for multiple mentioned users
ALTER TABLE public.desvios ADD COLUMN mentioned_user_ids uuid[] DEFAULT '{}';
ALTER TABLE public.desvios ADD COLUMN mentioned_user_names text[] DEFAULT '{}';

-- Update RLS policy to allow any mentioned user to update
DROP POLICY IF EXISTS "Creator or admin can update desvios" ON public.desvios;
CREATE POLICY "Creator or mentioned or admin can update desvios"
ON public.desvios FOR UPDATE
USING (
  auth.uid() = created_by 
  OR auth.uid() = mentioned_user_id 
  OR auth.uid() = ANY(mentioned_user_ids)
  OR is_admin(auth.uid())
);
