-- Migration: Add 'familiar' role to profiles
-- Date: 2026-04-22

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'resident', 'familiar'));