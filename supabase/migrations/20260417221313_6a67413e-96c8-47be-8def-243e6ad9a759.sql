-- Tornar a rádio (music_tracks) global em todos os ambientes
DROP POLICY IF EXISTS "Filter by environment" ON public.music_tracks;

-- Remover trigger de set_environment_on_insert se existir nesta tabela
DROP TRIGGER IF EXISTS set_environment_on_insert_music_tracks ON public.music_tracks;