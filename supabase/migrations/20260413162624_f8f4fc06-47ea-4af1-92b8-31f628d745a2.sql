
CREATE TABLE public.support_team_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area TEXT NOT NULL,
  tst TEXT NOT NULL DEFAULT '',
  enc_geral TEXT NOT NULL DEFAULT '',
  enc TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(area)
);

ALTER TABLE public.support_team_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read support_team_settings"
  ON public.support_team_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and moderators can update support_team_settings"
  ON public.support_team_settings FOR ALL TO authenticated
  USING (public.is_admin_or_moderator(auth.uid()))
  WITH CHECK (public.is_admin_or_moderator(auth.uid()));

-- Allow encarregados to also manage
CREATE POLICY "Encarregados can manage support_team_settings"
  ON public.support_team_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND cargo IN ('encarregado_geral', 'encarregado_i', 'encarregado_ii', 'aux_administrativo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND cargo IN ('encarregado_geral', 'encarregado_i', 'encarregado_ii', 'aux_administrativo')
    )
  );

-- Seed defaults
INSERT INTO public.support_team_settings (area, tst, enc_geral, enc)
VALUES 
  ('gabiao', 'ITAMAR DE SOUZA', 'DOMINGUES FABRICIO', 'JOSÉ MARIA CORREA'),
  ('jardinagem', 'ITAMAR DE SOUZA', 'DOMINGUES FABRICIO', 'RUDNEY SILVA');
