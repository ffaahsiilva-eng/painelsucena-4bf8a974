-- Add new cargo types for Motorista de Pipa and Motorista Operador de Munk
ALTER TYPE cargo_type ADD VALUE IF NOT EXISTS 'motorista_pipa';
ALTER TYPE cargo_type ADD VALUE IF NOT EXISTS 'motorista_munk';