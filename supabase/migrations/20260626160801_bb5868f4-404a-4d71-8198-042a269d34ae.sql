
CREATE TABLE IF NOT EXISTS public.google_drive_oauth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_email text,
  access_token text,
  refresh_token text NOT NULL,
  token_expires_at timestamptz,
  scope text,
  connected_by uuid REFERENCES auth.users(id),
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.google_drive_oauth TO authenticated;
GRANT ALL ON public.google_drive_oauth TO service_role;

ALTER TABLE public.google_drive_oauth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view google drive oauth"
ON public.google_drive_oauth FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_google_drive_oauth_updated_at
BEFORE UPDATE ON public.google_drive_oauth
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
