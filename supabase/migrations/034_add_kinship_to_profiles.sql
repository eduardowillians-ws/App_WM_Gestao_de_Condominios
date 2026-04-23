-- Migration: Add kinship and parent_id to profiles for family linking
-- Date: 2026-04-23

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS kinship TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.profiles(id);

-- Índice para busca rápida de dependentes
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles(parent_id);
