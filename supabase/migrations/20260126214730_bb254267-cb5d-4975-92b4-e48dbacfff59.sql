-- Create table for daily gabião reports
CREATE TABLE public.daily_gabiao_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid NOT NULL,
  local_servico text NOT NULL,
  
  -- Gabião activities
  limpeza_canaleta_m numeric DEFAULT 0,
  limpeza_canaleta_berma integer,
  recomposicao_gabiao_m numeric DEFAULT 0,
  recomposicao_gabiao_berma integer,
  manutencao_drenagem_m numeric DEFAULT 0,
  manutencao_drenagem_berma integer,
  limpeza_bueiro_unidade integer DEFAULT 0,
  limpeza_bueiro_berma integer,
  reparo_cerca_m numeric DEFAULT 0,
  reparo_cerca_berma integer,
  
  -- Other fields
  observacoes text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT daily_gabiao_reports_local_servico_check CHECK (local_servico IN ('FAIXA 2', 'FAIXA 3', 'FAIXA 4')),
  CONSTRAINT daily_gabiao_reports_berma_check CHECK (
    (limpeza_canaleta_berma IS NULL OR (limpeza_canaleta_berma >= 28 AND limpeza_canaleta_berma <= 56)) AND
    (recomposicao_gabiao_berma IS NULL OR (recomposicao_gabiao_berma >= 28 AND recomposicao_gabiao_berma <= 56)) AND
    (manutencao_drenagem_berma IS NULL OR (manutencao_drenagem_berma >= 28 AND manutencao_drenagem_berma <= 56)) AND
    (limpeza_bueiro_berma IS NULL OR (limpeza_bueiro_berma >= 28 AND limpeza_bueiro_berma <= 56)) AND
    (reparo_cerca_berma IS NULL OR (reparo_cerca_berma >= 28 AND reparo_cerca_berma <= 56))
  )
);

-- Enable RLS
ALTER TABLE public.daily_gabiao_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for Admin and Encarregado II only
CREATE POLICY "Admin and Encarregado II can view gabiao reports"
ON public.daily_gabiao_reports
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = 'encarregado_ii'
  )
);

CREATE POLICY "Admin and Encarregado II can insert gabiao reports"
ON public.daily_gabiao_reports
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.cargo = 'encarregado_ii'
    )
  )
);

CREATE POLICY "Admin and Encarregado II can update gabiao reports"
ON public.daily_gabiao_reports
FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = 'encarregado_ii'
  )
);

CREATE POLICY "Admin and Encarregado II can delete gabiao reports"
ON public.daily_gabiao_reports
FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = 'encarregado_ii'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_gabiao_reports_updated_at
  BEFORE UPDATE ON public.daily_gabiao_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();