ALTER TABLE public.equipment_stop_history
DROP CONSTRAINT IF EXISTS equipment_stop_history_stop_reason_check;

ALTER TABLE public.equipment_stop_history
ADD CONSTRAINT equipment_stop_history_stop_reason_check
CHECK (
  stop_reason = ANY (
    ARRAY[
      'none'::text,
      'maintenance'::text,
      'manutencao_corretiva'::text,
      'manutencao_preventiva'::text,
      'vistoria'::text,
      'aguardando_frente_servico'::text,
      'fim_turno'::text,
      'waiting'::text,
      'waiting_front'::text,
      'rain'::text,
      'end_of_shift'::text,
      'end_of_day'::text,
      'abastecimento'::text,
      'operando'::text,
      'almoco'::text,
      'servico'::text
    ]
  )
);

ALTER TABLE public.equipment
DROP CONSTRAINT IF EXISTS equipment_stop_reason_check;

ALTER TABLE public.equipment
ADD CONSTRAINT equipment_stop_reason_check
CHECK (
  stop_reason IS NULL
  OR stop_reason = ANY (
    ARRAY[
      'none'::text,
      'maintenance'::text,
      'manutencao_corretiva'::text,
      'manutencao_preventiva'::text,
      'vistoria'::text,
      'aguardando_frente_servico'::text,
      'fim_turno'::text,
      'waiting'::text,
      'waiting_front'::text,
      'rain'::text,
      'end_of_shift'::text,
      'end_of_day'::text,
      'abastecimento'::text,
      'operando'::text,
      'almoco'::text,
      'servico'::text
    ]
  )
);