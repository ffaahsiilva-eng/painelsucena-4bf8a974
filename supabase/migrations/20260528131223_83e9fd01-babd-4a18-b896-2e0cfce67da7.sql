-- Adiciona client_op_id para idempotência de operações offline
ALTER TABLE public.equipment_movements ADD COLUMN IF NOT EXISTS client_op_id uuid;
ALTER TABLE public.daily_shift_records ADD COLUMN IF NOT EXISTS client_op_id uuid;
ALTER TABLE public.equipment_stop_history ADD COLUMN IF NOT EXISTS client_op_id uuid;
ALTER TABLE public.driver_vehicle_checklists ADD COLUMN IF NOT EXISTS client_op_id uuid;
ALTER TABLE public.desvios ADD COLUMN IF NOT EXISTS client_op_id uuid;
ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS client_op_id uuid;

-- Índices únicos parciais: só valida quando client_op_id está preenchido
CREATE UNIQUE INDEX IF NOT EXISTS equipment_movements_client_op_id_uk
  ON public.equipment_movements (client_op_id) WHERE client_op_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_shift_records_client_op_id_uk
  ON public.daily_shift_records (client_op_id) WHERE client_op_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS equipment_stop_history_client_op_id_uk
  ON public.equipment_stop_history (client_op_id) WHERE client_op_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS driver_vehicle_checklists_client_op_id_uk
  ON public.driver_vehicle_checklists (client_op_id) WHERE client_op_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS desvios_client_op_id_uk
  ON public.desvios (client_op_id) WHERE client_op_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS material_requisitions_client_op_id_uk
  ON public.material_requisitions (client_op_id) WHERE client_op_id IS NOT NULL;