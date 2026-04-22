-- Migration: Grant invitation permissions to all residents and ensure check constraint includes 'familiar'
-- Date: 2026-04-22

-- 1. Ensure the check constraint is updated (in case 028 wasn't fully applied or to be safe)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'resident', 'familiar'));

-- 2. Update existing residents to allow them to invite family members
UPDATE public.profiles 
SET can_invite = true 
WHERE role = 'resident' AND (can_invite IS NULL OR can_invite = false);

-- 3. Ensure family members cannot invite others by default
UPDATE public.profiles 
SET can_invite = false 
WHERE role = 'familiar' AND (can_invite IS NULL OR can_invite = true);
