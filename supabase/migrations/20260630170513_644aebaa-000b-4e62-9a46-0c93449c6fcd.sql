INSERT INTO public.site_settings (environment, nav_order)
SELECT 'paragominas', nav_order FROM public.site_settings WHERE environment = 'barcarena'
ON CONFLICT (environment) DO UPDATE SET nav_order = EXCLUDED.nav_order;