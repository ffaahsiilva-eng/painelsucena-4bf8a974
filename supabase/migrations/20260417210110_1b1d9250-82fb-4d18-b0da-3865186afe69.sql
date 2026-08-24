-- Tabela de acesso por ambiente
CREATE TABLE IF NOT EXISTS public.user_environment_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment IN ('barcarena', 'paragominas')),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, environment)
);

CREATE INDEX IF NOT EXISTS user_environment_access_user_id_idx ON public.user_environment_access (user_id);

ALTER TABLE public.user_environment_access ENABLE ROW LEVEL SECURITY;

-- Usuários veem o próprio acesso; admins veem tudo
DROP POLICY IF EXISTS "Users can view own access" ON public.user_environment_access;
CREATE POLICY "Users can view own access"
  ON public.user_environment_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Apenas admins podem inserir/deletar
DROP POLICY IF EXISTS "Admins manage access (insert)" ON public.user_environment_access;
CREATE POLICY "Admins manage access (insert)"
  ON public.user_environment_access
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage access (delete)" ON public.user_environment_access;
CREATE POLICY "Admins manage access (delete)"
  ON public.user_environment_access
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Função utilitária para verificar acesso (admin sempre tem acesso a tudo)
CREATE OR REPLACE FUNCTION public.has_environment_access(_user_id uuid, _environment text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_environment_access
      WHERE user_id = _user_id AND environment = _environment
    )
    OR _environment = 'barcarena'  -- fallback: todo usuário tem Barcarena por padrão
$$;

-- Trigger: ao criar um novo usuário (profile), garantir Barcarena liberada
CREATE OR REPLACE FUNCTION public.grant_default_environment_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_environment_access (user_id, environment)
  VALUES (NEW.user_id, 'barcarena')
  ON CONFLICT (user_id, environment) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_default_env_access_on_profile ON public.profiles;
CREATE TRIGGER grant_default_env_access_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_default_environment_access();

-- Backfill: dar Barcarena a todos os profiles existentes
INSERT INTO public.user_environment_access (user_id, environment)
SELECT user_id, 'barcarena' FROM public.profiles
ON CONFLICT (user_id, environment) DO NOTHING;