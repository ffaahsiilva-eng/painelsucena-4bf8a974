
CREATE TABLE public.site_inspection_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  next_inspection_date date NOT NULL,
  next_inspection_time time NOT NULL DEFAULT '08:00',
  created_by uuid NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_inspection_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view schedule"
  ON public.site_inspection_schedule FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert schedule"
  ON public.site_inspection_schedule FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update schedule"
  ON public.site_inspection_schedule FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete schedule"
  ON public.site_inspection_schedule FOR DELETE
  USING (is_admin(auth.uid()));
