-- Add missing enum values that may still be referenced by cached old app versions
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'em_analise';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'comprado';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'recusado';