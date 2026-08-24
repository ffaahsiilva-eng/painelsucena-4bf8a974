ALTER TABLE public.meetings
ADD CONSTRAINT meetings_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES public.profiles(user_id)
ON DELETE SET NULL;