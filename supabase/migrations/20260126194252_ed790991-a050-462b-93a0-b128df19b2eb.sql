-- Create announcements table
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  target_type text NOT NULL DEFAULT 'all', -- 'all' or 'specific'
  target_users uuid[] DEFAULT '{}',
  scheduled_at timestamp with time zone,
  published_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create announcement reads table
CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- RLS policies for announcements
CREATE POLICY "Admins can manage announcements"
ON public.announcements
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view announcements targeted to them"
ON public.announcements
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    target_type = 'all' OR 
    auth.uid() = ANY(target_users)
  )
);

-- RLS policies for announcement_reads
CREATE POLICY "Users can mark announcements as read"
ON public.announcement_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reads"
ON public.announcement_reads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reads"
ON public.announcement_reads
FOR SELECT
USING (is_admin(auth.uid()));

-- Enable realtime for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;