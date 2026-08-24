ALTER TABLE public.inventory_movements DROP CONSTRAINT inventory_movements_destination_type_check;

ALTER TABLE public.inventory_movements ADD CONSTRAINT inventory_movements_destination_type_check 
CHECK (destination_type = ANY (ARRAY['employee'::text, 'equipment'::text, 'area'::text, 'gabiao'::text, 'jardinagem'::text, 'descarte'::text]));