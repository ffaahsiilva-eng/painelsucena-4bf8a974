
UPDATE profiles 
SET avatar_url = split_part(REPLACE(REPLACE(avatar_url, 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/public/site-assets/', ''), 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/sign/site-assets/', ''), '?', 1)
WHERE avatar_url LIKE 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/%/site-assets/%';

UPDATE site_settings
SET logo_url = split_part(REPLACE(REPLACE(logo_url, 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/public/site-assets/', ''), 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/sign/site-assets/', ''), '?', 1)
WHERE logo_url LIKE 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/%/site-assets/%';

UPDATE site_settings
SET transition_logo_url = split_part(REPLACE(REPLACE(transition_logo_url, 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/public/site-assets/', ''), 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/sign/site-assets/', ''), '?', 1)
WHERE transition_logo_url LIKE 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/%/site-assets/%';

UPDATE site_settings
SET login_background_url = split_part(REPLACE(REPLACE(login_background_url, 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/public/site-assets/', ''), 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/sign/site-assets/', ''), '?', 1)
WHERE login_background_url LIKE 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/%/site-assets/%';

UPDATE site_settings
SET login_transition_media_url = split_part(REPLACE(REPLACE(login_transition_media_url, 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/public/site-assets/', ''), 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/sign/site-assets/', ''), '?', 1)
WHERE login_transition_media_url LIKE 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/%/site-assets/%';

UPDATE site_settings
SET environment_selection_background_url = split_part(REPLACE(REPLACE(environment_selection_background_url, 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/public/site-assets/', ''), 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/sign/site-assets/', ''), '?', 1)
WHERE environment_selection_background_url LIKE 'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/%/site-assets/%';
