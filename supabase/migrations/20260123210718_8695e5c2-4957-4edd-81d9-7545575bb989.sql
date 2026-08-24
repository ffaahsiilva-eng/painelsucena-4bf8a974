-- Create a table to track when reports are saved/locked for a specific date
CREATE TABLE public.attendance_report_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  locked_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.attendance_report_locks ENABLE ROW LEVEL SECURITY;

-- Policies: Any authenticated user can read locks
CREATE POLICY "Anyone can view report locks" 
ON public.attendance_report_locks 
FOR SELECT 
USING (true);

-- Only authenticated users can create locks
CREATE POLICY "Authenticated users can create locks" 
ON public.attendance_report_locks 
FOR INSERT 
WITH CHECK (auth.uid() = locked_by);

-- Only the person who locked can unlock (delete)
CREATE POLICY "Users can delete their own locks" 
ON public.attendance_report_locks 
FOR DELETE 
USING (auth.uid() = locked_by);

-- Create index for faster lookups
CREATE INDEX idx_attendance_report_locks_date ON public.attendance_report_locks(date);