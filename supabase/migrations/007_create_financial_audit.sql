-- Migration: Create audit trail for financial operations
-- Run this in Supabase SQL Editor

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS financial_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW')),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE financial_audit ENABLE ROW LEVEL SECURITY;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_audit_entry ON financial_audit(entry_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON financial_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON financial_audit(action);
CREATE INDEX IF NOT EXISTS idx_audit_date ON financial_audit(created_at);

-- 4. Policies - only admins can manage
CREATE POLICY "Admins can view audit" ON financial_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit" ON financial_audit
  FOR INSERT
  WITH CHECK (true);