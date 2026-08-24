
CREATE OR REPLACE FUNCTION public.notify_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _cfg RECORD;
  _email text;
  _phone_admin text := '5593991080548';
  _cargo_label text;
  _msg text;
  _date_br text;
  _env_label text;
BEGIN
  SELECT enabled, instance_url, instance_token, instance_id
  INTO _cfg FROM public.wapi_config LIMIT 1;

  IF _cfg IS NULL OR _cfg.enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Evita duplicidade caso o trigger rode mais de uma vez para o mesmo user
  IF EXISTS (
    SELECT 1 FROM public.wapi_outbox
    WHERE origin = 'new-user-signup'
      AND external_kind = 'profile'
      AND external_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id LIMIT 1;

  _cargo_label := CASE NEW.cargo::text
    WHEN 'admin' THEN 'Administrador'
    WHEN 'engenheiro_planejamento' THEN 'Engenheiro de Planejamento'
    WHEN 'planejador' THEN 'Planejador'
    WHEN 'encarregado_geral' THEN 'Encarregado Geral'
    WHEN 'encarregado_i' THEN 'Encarregado I'
    WHEN 'encarregado_ii' THEN 'Encarregado II'
    WHEN 'aux_administrativo' THEN 'Auxiliar Administrativo'
    WHEN 'motorista_pipa' THEN 'Motorista Pipa'
    WHEN 'motorista_munk' THEN 'Motorista Munk'
    ELSE COALESCE(NEW.cargo::text, '—')
  END;

  _env_label := CASE COALESCE(NEW.environment, 'barcarena')
    WHEN 'barcarena' THEN 'Barcarena'
    WHEN 'paragominas' THEN 'Paragominas'
    ELSE COALESCE(NEW.environment, '—')
  END;

  _date_br := to_char(now() - interval '3 hours', 'DD/MM/YYYY HH24:MI');

  _msg := '👤 *NOVO USUÁRIO CADASTRADO*' || E'\n' ||
          '━━━━━━━━━━━━━━━━━━━━' || E'\n\n' ||
          '*Nome:* ' || COALESCE(NULLIF(trim(NEW.full_name), ''), '—') || E'\n' ||
          '*E-mail:* ' || COALESCE(_email, '—') || E'\n' ||
          '*Cargo:* ' || _cargo_label || E'\n' ||
          '*Unidade:* ' || _env_label || E'\n' ||
          '*WhatsApp:* ' || COALESCE(NULLIF(trim(NEW.whatsapp_number), ''), '—') || E'\n' ||
          '*Data:* ' || _date_br || E'\n\n' ||
          'Acesse o painel admin para liberar permissões.' || E'\n' ||
          '━━━━━━━━━━━━━━━━━━━━';

  INSERT INTO public.wapi_outbox (
    kind, target_type, phone, message, origin, external_kind, external_id, dedupe_key
  ) VALUES (
    'text', 'contact', _phone_admin, _msg, 'new-user-signup', 'profile', NEW.user_id,
    'new-user-signup|' || NEW.user_id::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_new_user_signup failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_new_user_signup ON public.profiles;
CREATE TRIGGER trg_notify_new_user_signup
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_user_signup();
