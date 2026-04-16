-- Migration: Create occurrences table for maintenance and complaints
-- Run this in Supabase SQL Editor

-- 1. Create occurrences table
CREATE TABLE IF NOT EXISTS occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resident_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  main_type TEXT NOT NULL CHECK (main_type IN ('RECLAMACAO', 'OCORRENCIA')),
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  observation TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_occurrences_user ON occurrences(user_id);
CREATE INDEX IF NOT EXISTS idx_occurrences_status ON occurrences(status);
CREATE INDEX IF NOT EXISTS idx_occurrences_date ON occurrences(date);
CREATE INDEX IF NOT EXISTS idx_occurrences_type ON occurrences(main_type);

-- 4. Policies for occurrences
-- Anyone can view their own occurrences
CREATE POLICY "Users can view own occurrences" ON occurrences
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR unit IN (SELECT unit FROM profiles WHERE id = auth.uid())
  );

-- Users can create their own occurrences
CREATE POLICY "Users can create occurrences" ON occurrences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own occurrences (only observation)
CREATE POLICY "Users can update own occurrences" ON occurrences
  FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can view all occurrences
CREATE POLICY "Admins can view all occurrences" ON occurrences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Admins can update all occurrences
CREATE POLICY "Admins can manage all occurrences" ON occurrences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );