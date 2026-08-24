-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('solicitado', 'aprovado', 'a_caminho', 'entregue', 'cancelado');

-- Create enum for quantity units
CREATE TYPE public.quantity_unit AS ENUM ('unidade', 'centimetros', 'metros', 'quilos', 'litros', 'pacotes', 'caixas', 'pecas');

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  requester_name TEXT NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL NOT NULL,
  quantity_unit quantity_unit NOT NULL DEFAULT 'unidade',
  expected_date DATE,
  status order_status NOT NULL DEFAULT 'solicitado',
  photo_urls TEXT[] DEFAULT '{}',
  ai_generated_image_url TEXT,
  mentioned_user_id UUID,
  mentioned_cargo TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies with correct cargo names
CREATE POLICY "Users can view their own orders or orders mentioning them"
ON public.orders
FOR SELECT
USING (
  auth.uid() = requester_id 
  OR auth.uid() = mentioned_user_id 
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('aux_administrativo', 'aux_almoxarifado')
  )
);

CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters can update their own pending orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() = requester_id 
  OR auth.uid() = mentioned_user_id
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.cargo IN ('aux_administrativo', 'aux_almoxarifado')
  )
);

CREATE POLICY "Requesters can delete their own pending orders"
ON public.orders
FOR DELETE
USING (
  auth.uid() = requester_id 
  AND status = 'solicitado'
);

-- Create order history table for status changes
CREATE TABLE public.order_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status order_status,
  new_status order_status NOT NULL,
  changed_by UUID NOT NULL,
  changed_by_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on history
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of their orders"
ON public.order_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_history.order_id 
    AND (
      orders.requester_id = auth.uid() 
      OR orders.mentioned_user_id = auth.uid()
      OR is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.cargo IN ('aux_administrativo', 'aux_almoxarifado')
      )
    )
  )
);

CREATE POLICY "Authenticated users can insert history"
ON public.order_history
FOR INSERT
WITH CHECK (auth.uid() = changed_by);

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for order photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-photos', 'order-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for order photos
CREATE POLICY "Anyone can view order photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-photos');

CREATE POLICY "Authenticated users can upload order photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own order photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'order-photos' AND auth.uid() IS NOT NULL);