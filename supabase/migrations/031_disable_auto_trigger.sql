-- Migration: Disable Supabase auto-trigger on auth.users
-- Date: 2026-04-22

-- Disable any trigger that auto-creates profiles from auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- Also ensure RLS allows service_role to write
ALTER TABLE public.invites DISABLE ROW LEVEL SECURITY;