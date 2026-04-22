-- Migration: Add can_invite field to profiles
-- Date: 2026-04-22

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS can_invite BOOLEAN DEFAULT false;