-- Allow end-of-shift/end-of-day stop reasons
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
      'waiting'::text,
      'rain'::text,
      'end_of_shift'::text,
      'end_of_day'::text
    ]
  )
);
