-- Create order_items table for multiple items per order
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  quantity_unit public.quantity_unit NOT NULL DEFAULT 'unidade',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies - same access as the parent order
CREATE POLICY "Users can view items of orders they can access"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.requester_id = auth.uid() 
      OR orders.mentioned_user_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.cargo = ANY(ARRAY['aux_administrativo'::cargo_type, 'aux_almoxarifado'::cargo_type])
      )
    )
  )
);

CREATE POLICY "Authenticated users can insert order items"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.requester_id = auth.uid()
  )
);

CREATE POLICY "Order owners can update items"
ON public.order_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.requester_id = auth.uid() 
      OR orders.mentioned_user_id = auth.uid() 
      OR is_admin(auth.uid())
    )
  )
);

CREATE POLICY "Order owners can delete items"
ON public.order_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.requester_id = auth.uid() 
    AND orders.status = 'solicitado'
  )
);