-- Add new date columns for equipment inspections
ALTER TABLE public.vehicle_inspections 
ADD COLUMN laudo_opacidade date,
ADD COLUMN laudo_mecanico date,
ADD COLUMN plano_manutencao date;

-- Rename validade_cracha to vistoria for clarity
ALTER TABLE public.vehicle_inspections 
RENAME COLUMN validade_cracha TO vistoria;