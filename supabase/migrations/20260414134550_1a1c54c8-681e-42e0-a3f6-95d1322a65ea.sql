
CREATE TABLE public.employee_nrs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  nr_name TEXT NOT NULL,
  completion_date DATE,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, nr_name)
);

ALTER TABLE public.employee_nrs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view employee NRs"
ON public.employee_nrs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert employee NRs"
ON public.employee_nrs FOR INSERT TO authenticated
WITH CHECK (public.can_manage_employees(auth.uid()));

CREATE POLICY "Admins and managers can update employee NRs"
ON public.employee_nrs FOR UPDATE TO authenticated
USING (public.can_manage_employees(auth.uid()));

CREATE POLICY "Admins and managers can delete employee NRs"
ON public.employee_nrs FOR DELETE TO authenticated
USING (public.can_manage_employees(auth.uid()));

CREATE TRIGGER update_employee_nrs_updated_at
BEFORE UPDATE ON public.employee_nrs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
