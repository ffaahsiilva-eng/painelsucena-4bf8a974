-- =============================================
-- ATIVIDADES I (daily_jardinagem_reports)
-- Somente Admin, Encarregado Geral e Encarregado I podem editar
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin and Encarregado I can delete jardinagem reports" ON public.daily_jardinagem_reports;
DROP POLICY IF EXISTS "Admin and Encarregado I can insert jardinagem reports" ON public.daily_jardinagem_reports;
DROP POLICY IF EXISTS "Admin and Encarregado I can update jardinagem reports" ON public.daily_jardinagem_reports;
DROP POLICY IF EXISTS "Admin and Encarregado I can view jardinagem reports" ON public.daily_jardinagem_reports;

-- Recreate with Encarregado Geral included
CREATE POLICY "Authorized users can view jardinagem reports"
ON public.daily_jardinagem_reports
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('encarregado_geral', 'encarregado_i')
  )
);

CREATE POLICY "Authorized users can insert jardinagem reports"
ON public.daily_jardinagem_reports
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.cargo IN ('encarregado_geral', 'encarregado_i')
    )
  )
);

CREATE POLICY "Authorized users can update jardinagem reports"
ON public.daily_jardinagem_reports
FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('encarregado_geral', 'encarregado_i')
  )
);

CREATE POLICY "Authorized users can delete jardinagem reports"
ON public.daily_jardinagem_reports
FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('encarregado_geral', 'encarregado_i')
  )
);

-- =============================================
-- ATIVIDADES II (daily_gabiao_reports)
-- Somente Admin, Encarregado Geral e Encarregado II podem editar
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin and Encarregado II can delete gabiao reports" ON public.daily_gabiao_reports;
DROP POLICY IF EXISTS "Admin and Encarregado II can insert gabiao reports" ON public.daily_gabiao_reports;
DROP POLICY IF EXISTS "Admin and Encarregado II can update gabiao reports" ON public.daily_gabiao_reports;
DROP POLICY IF EXISTS "Admin and Encarregado II can view gabiao reports" ON public.daily_gabiao_reports;

-- Recreate with Encarregado Geral included
CREATE POLICY "Authorized users can view gabiao reports"
ON public.daily_gabiao_reports
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('encarregado_geral', 'encarregado_ii')
  )
);

CREATE POLICY "Authorized users can insert gabiao reports"
ON public.daily_gabiao_reports
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.cargo IN ('encarregado_geral', 'encarregado_ii')
    )
  )
);

CREATE POLICY "Authorized users can update gabiao reports"
ON public.daily_gabiao_reports
FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('encarregado_geral', 'encarregado_ii')
  )
);

CREATE POLICY "Authorized users can delete gabiao reports"
ON public.daily_gabiao_reports
FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('encarregado_geral', 'encarregado_ii')
  )
);

-- =============================================
-- RDO (rdo_reports)
-- Somente Admin e Encarregado Geral podem editar
-- =============================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Authenticated users can update RDO reports" ON public.rdo_reports;

-- Recreate with only Encarregado Geral
CREATE POLICY "Encarregado Geral can update RDO reports"
ON public.rdo_reports
FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = 'encarregado_geral'
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo = 'encarregado_geral'
  )
);

-- =============================================
-- METAS (goals)
-- Admin, Planejador, Encarregado Geral, Encarregado I e Encarregado II podem editar
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin and Planejador can delete goals" ON public.goals;
DROP POLICY IF EXISTS "Admin and Planejador can insert goals" ON public.goals;
DROP POLICY IF EXISTS "Admin and Planejador can update goals" ON public.goals;
DROP POLICY IF EXISTS "Admin and Planejador can view goals" ON public.goals;

-- Recreate with expanded access
CREATE POLICY "Authorized users can view goals"
ON public.goals
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('planejador', 'encarregado_geral', 'encarregado_i', 'encarregado_ii')
  )
);

CREATE POLICY "Authorized users can insert goals"
ON public.goals
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.cargo IN ('planejador', 'encarregado_geral', 'encarregado_i', 'encarregado_ii')
    )
  )
);

CREATE POLICY "Authorized users can update goals"
ON public.goals
FOR UPDATE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('planejador', 'encarregado_geral', 'encarregado_i', 'encarregado_ii')
  )
);

CREATE POLICY "Authorized users can delete goals"
ON public.goals
FOR DELETE
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('planejador', 'encarregado_geral', 'encarregado_i', 'encarregado_ii')
  )
);