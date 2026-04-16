-- Migration: Create manutencao (maintenance) and certificados_operacionais tables
-- Date: 2026-04-15

-- 1. Manutencao table (Maintenance Jobs)
CREATE TABLE IF NOT EXISTS public.manutencao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task TEXT NOT NULL,
  area TEXT NOT NULL,
  type TEXT CHECK (type IN ('PREVENTIVA', 'CORRETIVA')) DEFAULT 'PREVENTIVA',
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'done', 'cancelled', 'delayed')) DEFAULT 'scheduled',
  responsible TEXT,
  invoice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Certificados Operacionais table (AVCB, Água, etc)
CREATE TABLE IF NOT EXISTS public.certificados_operacionais (
  id TEXT PRIMARY KEY,  -- 'AVCB', 'AGUA', etc.
  name TEXT NOT NULL,
  last_analysis_date DATE,
  expiry_date DATE NOT NULL,
  file_url TEXT,
  status TEXT CHECK (status IN ('valid', 'expired', 'warning')) DEFAULT 'valid',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados_operacionais ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write
CREATE POLICY "Allow all authenticated access to manutencao" ON public.manutencao
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated access to certificados" ON public.certificados_operacionais
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert default certificates if not exists
INSERT INTO public.certificados_operacionais (id, name, expiry_date, status)
VALUES 
  ('AVCB', 'AVCB - Certificado do Corpo de Bombeiros', '2025-12-31', 'valid'),
  ('AGUA', 'Análise de Qualidade da Água', '2025-12-31', 'valid')
ON CONFLICT (id) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_manutencao_date ON public.manutencao(date);
CREATE INDEX IF NOT EXISTS idx_manutencao_status ON public.manutencao(status);
CREATE INDEX IF NOT EXISTS idx_certificados_status ON public.certificados_operacionais(status);