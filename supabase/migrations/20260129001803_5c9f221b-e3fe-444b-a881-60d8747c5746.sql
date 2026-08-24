-- Create table to store product images
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_ni VARCHAR(50) NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  image_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read product images (public catalog)
CREATE POLICY "Anyone can view product images" 
ON public.product_images 
FOR SELECT 
USING (true);

-- Only authenticated users can insert/update
CREATE POLICY "Authenticated users can insert product images" 
ON public.product_images 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update product images" 
ON public.product_images 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_product_images_updated_at
BEFORE UPDATE ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();