ALTER TABLE public.site_settings 
ADD COLUMN page_loading_img_url TEXT;

COMMENT ON COLUMN public.site_settings.page_loading_img_url IS 'URL da imagem personalizada exibida durante o carregamento de páginas.';