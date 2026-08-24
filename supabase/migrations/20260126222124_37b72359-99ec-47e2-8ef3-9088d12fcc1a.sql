-- Create goals table for monthly targets
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL, -- Format: "2025-01" (YYYY-MM)
  rocagem_m2 numeric NOT NULL DEFAULT 0,
  podagem_unidade integer NOT NULL DEFAULT 0,
  coroamento_unidade integer NOT NULL DEFAULT 0,
  plantio_unidade integer NOT NULL DEFAULT 0,
  controle_invasoras_unidade integer NOT NULL DEFAULT 0,
  retirada_mudas_unidade integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  UNIQUE(month_year)
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Only Admin and Planejador can view goals
CREATE POLICY "Admin and Planejador can view goals"
ON public.goals
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = 'planejador'
  )
);

-- Only Admin and Planejador can insert goals
CREATE POLICY "Admin and Planejador can insert goals"
ON public.goals
FOR INSERT
WITH CHECK (
  (auth.uid() = created_by) AND (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.cargo = 'planejador'
    )
  )
);

-- Only Admin and Planejador can update goals
CREATE POLICY "Admin and Planejador can update goals"
ON public.goals
FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = 'planejador'
  )
);

-- Only Admin and Planejador can delete goals
CREATE POLICY "Admin and Planejador can delete goals"
ON public.goals
FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = 'planejador'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();