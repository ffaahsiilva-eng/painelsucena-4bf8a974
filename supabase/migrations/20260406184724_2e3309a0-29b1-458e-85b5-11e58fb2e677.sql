
CREATE TABLE public.dds_participation_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dds_date DATE NOT NULL UNIQUE,
  locked_by UUID NOT NULL,
  locked_by_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dds_participation_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view locks"
ON public.dds_participation_locks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and TSTs can manage locks"
ON public.dds_participation_locks
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND cargo IN ('tecnico_seguranca_i', 'tecnico_seguranca_ii', 'tecnico_meio_ambiente')
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND cargo IN ('tecnico_seguranca_i', 'tecnico_seguranca_ii', 'tecnico_meio_ambiente')
  )
);

-- Also allow any authenticated user to INSERT (lock on save)
CREATE POLICY "Any authenticated user can lock on save"
ON public.dds_participation_locks
FOR INSERT
TO authenticated
WITH CHECK (true);
