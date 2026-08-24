ALTER TABLE public.attendance_area_assignments
DROP CONSTRAINT IF EXISTS attendance_area_assignments_area_check;

ALTER TABLE public.attendance_area_assignments
ADD CONSTRAINT attendance_area_assignments_area_check
CHECK (
  area = ANY (ARRAY['gabiao'::text, 'jardinagem'::text, 'adm'::text, 'transporte'::text, 'custom'::text])
  OR area ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
);