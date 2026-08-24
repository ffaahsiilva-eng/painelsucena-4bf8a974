-- Drop the unique constraint first if it doesn't match the new requirements
ALTER TABLE nr_records DROP CONSTRAINT IF EXISTS nr_records_unique_colab_row_nr;
ALTER TABLE nr_records DROP CONSTRAINT IF EXISTS nr_records_collaborator_id_nr_id_key;

-- We want to identify the collaborator uniquely across environments.
-- If rh_efetivo has 'colaboradores' as JSONB, the ID inside JSONB (c.id) 
-- is the stable one per environment. 
-- However, if we want to save per collaborator name + function as a fallback 
-- to ensure individuality if IDs clash across tables.

-- But based on code, we are using:
-- collaborator_id = c.id (integer from JSONB)
-- db_row_id = row.id (uuid of the rh_efetivo record)

-- So the unique constraint should be (collaborator_id, db_row_id, nr_id)
ALTER TABLE nr_records ADD CONSTRAINT nr_records_unique_colab_row_nr UNIQUE (collaborator_id, db_row_id, nr_id);

-- Ensure grants are correct
GRANT ALL ON nr_records TO authenticated;
GRANT ALL ON nr_records TO service_role;
GRANT ALL ON nr_catalog TO authenticated;
GRANT ALL ON nr_catalog TO service_role;
