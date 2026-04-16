-- Migration: Create access_logs table for tracking entry/exit of residents and visitors
-- Run this in Supabase SQL Editor

-- 1. Create access_logs table
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  block_id TEXT,
  unit TEXT,
  access_type TEXT NOT NULL CHECK (access_type IN ('MORADOR', 'VISITANTE', 'PRESTADOR', 'ENTREGA')),
  direction TEXT NOT NULL CHECK (direction IN ('ENTRY', 'EXIT')),
  name TEXT NOT NULL,
  document TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_access_logs_profile ON access_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_block ON access_logs(block_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_unit ON access_logs(unit);
CREATE INDEX IF NOT EXISTS idx_access_logs_created ON access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_type ON access_logs(access_type);

-- 4. Policies
-- Anyone can view their own access logs
CREATE POLICY "Users can view own access logs" ON access_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR profile_id = (SELECT id FROM profiles WHERE id = auth.uid())
  );

-- Admins can view all access logs
CREATE POLICY "Admins can view all access logs" ON access_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Anyone authenticated can create access logs
CREATE POLICY "Authenticated can create access logs" ON access_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Admins can manage all access logs
CREATE POLICY "Admins can manage access logs" ON access_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );