-- Migration: Create financial tables for condo management
-- Run this in Supabase SQL Editor

-- 1. Create financial_entries table
CREATE TABLE IF NOT EXISTS financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id),
  description TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('RECEITA', 'DESPESA')),
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method TEXT,
  receipt_url TEXT,
  notes TEXT,
  unit TEXT,
  recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create balance_history table for tracking
CREATE TABLE IF NOT EXISTS balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  total_income DECIMAL(12,2) DEFAULT 0,
  total_expense DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_history ENABLE ROW LEVEL SECURITY;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_financial_type ON financial_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_financial_status ON financial_entries(status);
CREATE INDEX IF NOT EXISTS idx_financial_date ON financial_entries(date);
CREATE INDEX IF NOT EXISTS idx_financial_category ON financial_entries(category);

-- 5. Policies - only admins can manage
CREATE POLICY "Anyone can view financial entries" ON financial_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can manage financial entries" ON financial_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Balance history policies
CREATE POLICY "Admins can manage balance" ON balance_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );