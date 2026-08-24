-- Removendo as notificações de requisição de EPI e Material dos anúncios visíveis no site
CREATE OR REPLACE FUNCTION public.fn_wapi_broadcast_on_outbox()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Não cria anúncio no site se não for para grupo
  IF NEW.target_type <> 'group' THEN
    RETURN NEW;
  END IF;

  -- Lista de origens que NÃO devem gerar popup/anúncio no site
  -- Adicionando requisition_epi e requisition_material conforme solicitado
  IF NEW.origin IN (
    'chat_notification',
    'billing',
    'new-user-signup',
    'manual_resend',
    'requisition_epi',
    'requisition_material'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.wapi_broadcasts (origin, kind, target_type, message, image_url, caption, environment)
  VALUES (NEW.origin, NEW.kind, NEW.target_type, NEW.message, NEW.image_url, NEW.caption,
          COALESCE(NEW.environment, public.current_environment()));

  RETURN NEW;
END;
$function$;

GRANT ALL ON FUNCTION public.fn_wapi_broadcast_on_outbox() TO service_role;
GRANT ALL ON FUNCTION public.fn_wapi_broadcast_on_outbox() TO authenticated;