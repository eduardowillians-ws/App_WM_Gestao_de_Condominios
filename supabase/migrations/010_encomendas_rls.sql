-- Migration: RLS policies for encomendas table
-- Date: 2026-04-15

-- Enable RLS on encomendas table
ALTER TABLE public.encomendas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.encomendas;
DROP POLICY IF EXISTS "Allow read access to all authenticated" ON public.encomendas;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.encomendas;

-- Policy: Anyone authenticated can read
CREATE POLICY "Allow read access to all authenticated" ON public.encomendas
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Anyone authenticated can insert (for portaria/admin use)
CREATE POLICY "Allow insert for authenticated" ON public.encomendas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Anyone authenticated can update
CREATE POLICY "Allow update for authenticated" ON public.encomendas
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Anyone authenticated can delete
CREATE POLICY "Allow delete for authenticated" ON public.encomendas
  FOR DELETE USING (auth.role() = 'authenticated');