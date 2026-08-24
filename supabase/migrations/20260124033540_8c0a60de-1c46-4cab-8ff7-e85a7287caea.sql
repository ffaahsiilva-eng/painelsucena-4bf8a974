-- Create storage locations table
CREATE TABLE public.storage_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  quantity INTEGER NOT NULL DEFAULT 0,
  min_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unidade',
  ca_number TEXT,
  ca_expiry DATE,
  location_id UUID REFERENCES public.storage_locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory movements table (for tracking in/out)
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'ajuste')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT,
  moved_by UUID NOT NULL,
  moved_by_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies for storage_locations
CREATE POLICY "Anyone can view storage locations" ON public.storage_locations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert storage locations" ON public.storage_locations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update storage locations" ON public.storage_locations FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete storage locations" ON public.storage_locations FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS policies for inventory_items
CREATE POLICY "Anyone can view inventory items" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert inventory items" ON public.inventory_items FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update inventory items" ON public.inventory_items FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete inventory items" ON public.inventory_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS policies for inventory_movements
CREATE POLICY "Anyone can view inventory movements" ON public.inventory_movements FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert inventory movements" ON public.inventory_movements FOR INSERT WITH CHECK (auth.uid() = moved_by);

-- Insert default locations
INSERT INTO public.storage_locations (name, description) VALUES
  ('Almoxarifado Principal', 'Estoque central de materiais'),
  ('Canteiro de Obras', 'Materiais no local da obra'),
  ('Escritório', 'Materiais administrativos');

-- Insert some default EPI items
INSERT INTO public.inventory_items (name, category, quantity, min_quantity, unit, created_by, location_id)
SELECT 
  item.name,
  'epi',
  item.qty,
  item.min_qty,
  'unidade',
  '00000000-0000-0000-0000-000000000000'::uuid,
  (SELECT id FROM public.storage_locations WHERE name = 'Almoxarifado Principal' LIMIT 1)
FROM (VALUES 
  ('Capacete de Segurança', 50, 10),
  ('Luvas de Proteção', 100, 20),
  ('Óculos de Segurança', 80, 15),
  ('Botina de Segurança', 40, 10),
  ('Protetor Auricular', 60, 15),
  ('Colete Refletivo', 30, 5)
) AS item(name, qty, min_qty);

-- Enable realtime for inventory
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_movements;