
-- Table for site inspections
CREATE TABLE public.site_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for inspection tasks (improvement points)
CREATE TABLE public.site_inspection_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.site_inspections(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_inspection_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view site inspections" ON public.site_inspections FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create site inspections" ON public.site_inspections FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update site inspections" ON public.site_inspections FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete site inspections" ON public.site_inspections FOR DELETE USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view tasks" ON public.site_inspection_tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create tasks" ON public.site_inspection_tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update tasks" ON public.site_inspection_tasks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete tasks" ON public.site_inspection_tasks FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER update_site_inspections_updated_at BEFORE UPDATE ON public.site_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
