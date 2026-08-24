-- Remove vínculo incorreto e converte para texto
ALTER TABLE public.nr_records DROP CONSTRAINT IF EXISTS nr_records_collaborator_id_fkey;
ALTER TABLE public.nr_records DROP CONSTRAINT IF EXISTS nr_records_unique_colab_row_nr;

ALTER TABLE public.nr_records ALTER COLUMN collaborator_id TYPE text USING collaborator_id::text;

-- Garante vínculo da linha de efetivo
ALTER TABLE public.nr_records DROP CONSTRAINT IF EXISTS nr_records_db_row_id_fkey;
ALTER TABLE public.nr_records
  ADD CONSTRAINT nr_records_db_row_id_fkey
  FOREIGN KEY (db_row_id) REFERENCES public.rh_efetivo(id) ON DELETE CASCADE;

ALTER TABLE public.nr_records
  ADD CONSTRAINT nr_records_unique_colab_row_nr UNIQUE (collaborator_id, db_row_id, nr_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nr_records TO authenticated;
GRANT ALL ON public.nr_records TO service_role;