-- Migration: Add exit_date and status fields to profiles for soft delete
-- Run this in Supabase SQL Editor

-- Add exit_date column if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exit_date DATE;

-- Add status column with default 'active' if not exists  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Update existing records to have active status
UPDATE profiles SET status = 'active' WHERE status IS NULL;

-- Create index for filtering inactive residents
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);