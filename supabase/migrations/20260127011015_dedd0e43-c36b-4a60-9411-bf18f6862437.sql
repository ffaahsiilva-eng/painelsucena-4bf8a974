-- Add adubagem_unidade column to goals table
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS adubagem_unidade integer NOT NULL DEFAULT 0;