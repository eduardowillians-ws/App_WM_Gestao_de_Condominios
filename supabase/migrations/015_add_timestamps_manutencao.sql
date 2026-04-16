-- Fix: Add missing created_at and updated_at columns to manutencao
-- Date: 2026-04-15

ALTER TABLE public.manutencao ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.manutencao ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();