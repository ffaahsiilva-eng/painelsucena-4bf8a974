ALTER TABLE public.wapi_config
  ADD COLUMN IF NOT EXISTS group_id_requisitions text,
  ADD COLUMN IF NOT EXISTS group_id_reminders text,
  ADD COLUMN IF NOT EXISTS group_id_aso text,
  ADD COLUMN IF NOT EXISTS group_id_matrix text,
  ADD COLUMN IF NOT EXISTS group_id_forbidden_color text,
  ADD COLUMN IF NOT EXISTS group_id_campaign text,
  ADD COLUMN IF NOT EXISTS group_id_equipment_movements text,
  ADD COLUMN IF NOT EXISTS group_id_planning text,
  ADD COLUMN IF NOT EXISTS group_id_billing text,
  ADD COLUMN IF NOT EXISTS group_id_vehicle_inspection text,
  ADD COLUMN IF NOT EXISTS group_id_sling_inspection text,
  ADD COLUMN IF NOT EXISTS group_id_dds text;