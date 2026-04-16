-- Fix: Drop and recreate status check constraint with correct values
-- Date: 2026-04-15

-- Drop the existing check constraint
ALTER TABLE public.manutencao DROP CONSTRAINT IF EXISTS manutencao_status_check;

-- Recreate with correct values (including 'pendente', 'concluido', 'cancelado')
ALTER TABLE public.manutencao ADD CONSTRAINT manutencao_status_check 
CHECK (status IN ('scheduled', 'done', 'cancelled', 'delayed', 'pendente', 'concluido', 'cancelado'));

-- Verify current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'manutencao_status_check';