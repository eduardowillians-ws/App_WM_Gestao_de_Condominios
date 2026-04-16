-- Migration: Create assemblies and votes tables for online voting
-- Run this in Supabase SQL Editor

-- 1. Create assemblies table
CREATE TABLE IF NOT EXISTS assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  assembly_type TEXT CHECK (assembly_type IN ('ORDINÁRIA', 'EXTRAORDINÁRIA')) DEFAULT 'ORDINÁRIA',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
  quorum_required INTEGER DEFAULT 50,
  minutes_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create votes table
CREATE TABLE IF NOT EXISTS assembly_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID REFERENCES assemblies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  vote TEXT NOT NULL CHECK (vote IN ('aprovo', 'rejeito', 'abstencao')),
  comment TEXT,
  voted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assembly_id, user_id)
);

-- 3. Create audit for assembly actions
CREATE TABLE IF NOT EXISTS assembly_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID REFERENCES assemblies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'CLOSE', 'VOTE', 'UPDATE')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_audit ENABLE ROW LEVEL SECURITY;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_assemblies_status ON assemblies(status);
CREATE INDEX IF NOT EXISTS idx_votes_assembly ON assembly_votes(assembly_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON assembly_votes(user_id);

-- 6. Policies
-- Everyone can view active assemblies
CREATE POLICY "Anyone can view assemblies" ON assemblies
  FOR SELECT
  USING (status IN ('active', 'closed'));

-- Admins and managers can manage all assemblies
CREATE POLICY "Admins can manage assemblies" ON assemblies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Users can view their own votes
CREATE POLICY "Users can view own votes" ON assembly_votes
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can vote
CREATE POLICY "Users can vote" ON assembly_votes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins and managers can view all votes
CREATE POLICY "Admins can view votes" ON assembly_votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Audit policies
CREATE POLICY "Admins can view audit" ON assembly_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can insert audit" ON assembly_audit
  FOR INSERT
  WITH CHECK (true);