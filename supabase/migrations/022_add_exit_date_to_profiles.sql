-- Migration: Add exit_date to profiles
-- Date: 2026-04-15

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS exit_date TIMESTAMPTZ;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS block_id TEXT;