-- Add environment column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS environment TEXT;

-- Function to sync profile environment with user_environment_access
CREATE OR REPLACE FUNCTION public.sync_profile_environment_access()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.environment IS NOT NULL THEN
        -- Insert into user_environment_access if it doesn't exist
        INSERT INTO public.user_environment_access (user_id, environment)
        VALUES (NEW.user_id, NEW.environment)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after profile insert or update
DROP TRIGGER IF EXISTS tr_sync_profile_environment_access ON public.profiles;
CREATE TRIGGER tr_sync_profile_environment_access
AFTER INSERT OR UPDATE OF environment ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_environment_access();
