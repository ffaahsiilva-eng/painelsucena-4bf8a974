-- Create enum for employee status
CREATE TYPE public.employee_status AS ENUM ('active', 'vacation', 'leave');

-- Create enum for attendance status
CREATE TYPE public.attendance_status AS ENUM ('present', 'late', 'absent', 'justified');

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar TEXT NOT NULL,
  status employee_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TEXT,
  check_out TEXT,
  status attendance_status NOT NULL DEFAULT 'present',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (since there's no auth yet)
CREATE POLICY "Allow public read access to employees"
ON public.employees
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to employees"
ON public.employees
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to employees"
ON public.employees
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete to employees"
ON public.employees
FOR DELETE
USING (true);

CREATE POLICY "Allow public read access to attendance"
ON public.attendance_records
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to attendance"
ON public.attendance_records
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to attendance"
ON public.attendance_records
FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete to attendance"
ON public.attendance_records
FOR DELETE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();