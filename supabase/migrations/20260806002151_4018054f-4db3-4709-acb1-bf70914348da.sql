ALTER TABLE nr_records ADD COLUMN IF NOT EXISTS db_row_id uuid;
-- Update unique constraint to include db_row_id
ALTER TABLE nr_records DROP CONSTRAINT IF EXISTS nr_records_collaborator_id_nr_id_key;
ALTER TABLE nr_records ADD CONSTRAINT nr_records_unique_colab_row_nr UNIQUE (collaborator_id, db_row_id, nr_id);