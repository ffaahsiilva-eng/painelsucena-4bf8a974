-- Add new cargo types to the enum
ALTER TYPE public.cargo_type ADD VALUE IF NOT EXISTS 'engenheiro_civil';
ALTER TYPE public.cargo_type ADD VALUE IF NOT EXISTS 'engenheiro_planejamento';
ALTER TYPE public.cargo_type ADD VALUE IF NOT EXISTS 'tecnico_planejamento';
ALTER TYPE public.cargo_type ADD VALUE IF NOT EXISTS 'engenheiro_seguranca';