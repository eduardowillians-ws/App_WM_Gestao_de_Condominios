-- Migration: Add email and updated_at to profiles for better sync
-- Date: 2026-04-23

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sincronizar emails existentes se houver (opcional)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
