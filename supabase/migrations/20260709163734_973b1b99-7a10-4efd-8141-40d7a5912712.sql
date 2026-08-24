ALTER TABLE public.attendance_area_assignments DROP CONSTRAINT IF EXISTS attendance_area_assignments_area_check;
ALTER TABLE public.attendance_area_assignments ADD CONSTRAINT attendance_area_assignments_area_check CHECK (area = ANY (ARRAY['gabiao'::text, 'jardinagem'::text, 'adm'::text, 'transporte'::text, 'custom'::text]));

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS custom_attendance_area_label text;