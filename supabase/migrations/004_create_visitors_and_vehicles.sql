-- Vehicle tags policies - CORRIGIDAS
-- Everyone can view their unit tags OR all if admin
DROP POLICY IF EXISTS "Users can view unit tags" ON vehicle_tags;
DROP POLICY IF EXISTS "Users can create tags" ON vehicle_tags;
DROP POLICY IF EXISTS "Admins can manage all tags" ON vehicle_tags;

-- Select: users can see their own unit tags OR admins see all
CREATE POLICY "Anyone can view vehicle tags" ON vehicle_tags
  FOR SELECT
  USING (
    unit = (SELECT unit FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Insert: users can create for their own unit OR admins for all
CREATE POLICY "Users can create vehicle tags" ON vehicle_tags
  FOR INSERT
  WITH CHECK (
    unit = (SELECT unit FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Update: users can update their own OR admins can update all
CREATE POLICY "Users can update vehicle tags" ON vehicle_tags
  FOR UPDATE
  USING (
    unit = (SELECT unit FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Delete: users can delete their own OR admins can delete all
CREATE POLICY "Users can delete vehicle tags" ON vehicle_tags
  FOR DELETE
  USING (
    unit = (SELECT unit FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );