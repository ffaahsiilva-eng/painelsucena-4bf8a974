-- Create a table to store matrix task completions with monthly reset
CREATE TABLE public.matrix_task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id TEXT NOT NULL,
  month_year TEXT NOT NULL, -- Format: "YYYY-MM" to track the month
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id, month_year)
);

-- Enable Row Level Security
ALTER TABLE public.matrix_task_completions ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own task completions" 
ON public.matrix_task_completions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task completions" 
ON public.matrix_task_completions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task completions" 
ON public.matrix_task_completions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_matrix_task_completions_user_month ON public.matrix_task_completions(user_id, month_year);