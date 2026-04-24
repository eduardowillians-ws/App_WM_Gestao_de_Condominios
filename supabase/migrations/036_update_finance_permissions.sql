-- Migration: Update financial permissions to include manager role
-- Date: 2026-04-24

-- 1. Update financial_entries policies
DROP POLICY IF EXISTS "Admins can manage financial entries" ON financial_entries;
CREATE POLICY "Admins and Managers can manage financial entries" ON financial_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- 2. Update balance_history policies
DROP POLICY IF EXISTS "Admins can manage balance" ON balance_history;
CREATE POLICY "Admins and Managers can manage balance" ON balance_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- 3. Update financial_audit policies
DROP POLICY IF EXISTS "Admins can view audit" ON financial_audit;
CREATE POLICY "Admins and Managers can view audit" ON financial_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
