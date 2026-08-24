-- Add new values to equipment_exit_reason enum
ALTER TYPE equipment_exit_reason ADD VALUE IF NOT EXISTS 'operando';
ALTER TYPE equipment_exit_reason ADD VALUE IF NOT EXISTS 'aguardando_frente_servico';
ALTER TYPE equipment_exit_reason ADD VALUE IF NOT EXISTS 'fim_turno';