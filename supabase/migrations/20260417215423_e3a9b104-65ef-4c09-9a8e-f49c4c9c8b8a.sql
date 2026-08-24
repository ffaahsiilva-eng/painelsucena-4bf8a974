-- Garante que environment seja sempre derivado do header atual no INSERT,
-- ignorando o default 'barcarena'. Isso impede vazamento entre ambientes.
CREATE OR REPLACE FUNCTION public.set_environment_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Sempre sobrescreve com o ambiente atual do header,
  -- a não ser que o INSERT tenha enviado um valor explicitamente diferente do default.
  NEW.environment := public.current_environment();
  RETURN NEW;
END;
$$;