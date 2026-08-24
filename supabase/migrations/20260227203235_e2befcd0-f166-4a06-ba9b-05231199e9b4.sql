
-- Create notas_fiscais table
CREATE TABLE public.notas_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  fornecedor TEXT NOT NULL,
  valor NUMERIC,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT,
  file_url TEXT,
  file_name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "Authenticated users can view notas fiscais"
  ON public.notas_fiscais FOR SELECT
  TO authenticated
  USING (true);

-- Only admin, aux_administrativo, preposto can insert
CREATE POLICY "Authorized users can insert notas fiscais"
  ON public.notas_fiscais FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.cargo IN ('aux_administrativo', 'preposto')
    )
  );

-- Only admin, aux_administrativo, preposto can update
CREATE POLICY "Authorized users can update notas fiscais"
  ON public.notas_fiscais FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.cargo IN ('aux_administrativo', 'preposto')
    )
  );

-- Only admin can delete
CREATE POLICY "Admin can delete notas fiscais"
  ON public.notas_fiscais FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('notas-fiscais', 'notas-fiscais', true);

-- Storage policies
CREATE POLICY "Anyone authenticated can view notas fiscais files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'notas-fiscais');

CREATE POLICY "Authorized users can upload notas fiscais files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'notas-fiscais' AND (
      is_admin(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.cargo IN ('aux_administrativo', 'preposto')
      )
    )
  );

CREATE POLICY "Authorized users can update notas fiscais files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'notas-fiscais' AND (
      is_admin(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.cargo IN ('aux_administrativo', 'preposto')
      )
    )
  );

CREATE POLICY "Admin can delete notas fiscais files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'notas-fiscais' AND is_admin(auth.uid()));
