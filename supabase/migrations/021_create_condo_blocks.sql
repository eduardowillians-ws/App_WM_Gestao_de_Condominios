-- Migration: Create condo_blocks table
-- Date: 2026-04-15

CREATE TABLE IF NOT EXISTS public.condo_blocks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  total_units INTEGER DEFAULT 0,
  units TEXT[],  -- Array of unit numbers as text
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.condo_blocks ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Allow all access to condo_blocks" ON public.condo_blocks FOR ALL USING (auth.role() = 'authenticated');

-- Insert default blocks
INSERT INTO public.condo_blocks (id, name, total_units, units) VALUES 
  ('b1', 'Torre Alpha', 20, ARRAY['101','102','103','104','201','202','203','204','301','302','303','304','401','402','403','404','501','502','503','504']),
  ('b2', 'Torre Beta', 10, ARRAY['11','12','21','22','31','32','41','42','51','52'])
ON CONFLICT DO NOTHING;