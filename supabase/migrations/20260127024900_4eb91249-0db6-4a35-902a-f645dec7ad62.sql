-- Create table for RDO report locks
CREATE TABLE public.rdo_report_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  locked_by UUID NOT NULL,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rdo_report_locks ENABLE ROW LEVEL SECURITY;

-- Anyone can view locks
CREATE POLICY "Anyone can view RDO locks"
ON public.rdo_report_locks
FOR SELECT
USING (true);

-- Authenticated users can create locks
CREATE POLICY "Authenticated users can create RDO locks"
ON public.rdo_report_locks
FOR INSERT
WITH CHECK (auth.uid() = locked_by);

-- Users can delete their own locks OR admins can delete any lock
CREATE POLICY "Users or admins can delete RDO locks"
ON public.rdo_report_locks
FOR DELETE
USING (auth.uid() = locked_by OR is_admin(auth.uid()));