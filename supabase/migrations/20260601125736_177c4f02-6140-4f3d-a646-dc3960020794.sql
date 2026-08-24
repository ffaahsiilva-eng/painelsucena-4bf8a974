-- Add missing columns to desvios table
ALTER TABLE public.desvios 
ADD COLUMN IF NOT EXISTS instruction TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS priority TEXT,
ADD COLUMN IF NOT EXISTS responsible_name TEXT,
ADD COLUMN IF NOT EXISTS responsible_company TEXT,
ADD COLUMN IF NOT EXISTS responsible_sector TEXT,
ADD COLUMN IF NOT EXISTS comments TEXT,
ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add company column to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS company TEXT;

-- Update status constraint or logic if needed (optional since status is text)
-- The requested statuses are: Aberto, Em Tratamento, Aguardando Validação, Concluído, Cancelado
