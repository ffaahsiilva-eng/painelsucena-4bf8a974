
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS forbidden_color_title text DEFAULT 'Cores Proibidas por Mês',
  ADD COLUMN IF NOT EXISTS forbidden_colors_by_month jsonb DEFAULT '["red","blue","yellow","green","red","blue","yellow","green","red","blue","yellow","green"]'::jsonb;
