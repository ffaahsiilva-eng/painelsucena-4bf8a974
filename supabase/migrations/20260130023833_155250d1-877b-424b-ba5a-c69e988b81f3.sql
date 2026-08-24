-- Create overtime_records table
CREATE TABLE public.overtime_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  cargo TEXT NOT NULL,
  record_date DATE NOT NULL,
  entry_time TIME NOT NULL,
  exit_time TIME NOT NULL,
  is_overtime BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.overtime_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all overtime records"
ON public.overtime_records
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own overtime records"
ON public.overtime_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own overtime records"
ON public.overtime_records
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own overtime records or admins can delete any"
ON public.overtime_records
FOR DELETE
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_overtime_records_updated_at
BEFORE UPDATE ON public.overtime_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.overtime_records;