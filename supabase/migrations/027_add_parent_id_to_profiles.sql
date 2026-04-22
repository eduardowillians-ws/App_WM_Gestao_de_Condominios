-- Migration: Add parent_id to track who created the user
-- Date: 2026-04-22

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES auth.users(id);