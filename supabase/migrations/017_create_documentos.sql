-- Migration: Create documentos_juridicos table
-- Date: 2026-04-15

CREATE TABLE IF NOT EXISTS public.documentos_juridicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT CHECK (status IN ('Válido', 'Vencido', 'Pendente', 'Arquivado')) DEFAULT 'Pendente',
  upload_date DATE NOT NULL,
  expiry_date DATE,
  file_url TEXT,
  description TEXT,
  size TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.documentos_juridicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated access to documentos" ON public.documentos_juridicos;

CREATE POLICY "Allow all authenticated access to documentos" ON public.documentos_juridicos
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert sample documents
INSERT INTO public.documentos_juridicos (name, category, status, upload_date, expiry_date, description, size)
VALUES 
  ('Regimento Interno 2024.pdf', 'Regimento', 'Válido', '2024-01-15', '2027-01-15', 'Regras de convivência e uso das áreas comuns atualizadas na última assembleia.', '2.4 MB'),
  ('Contrato Elevadores OTIS.pdf', 'Contratos', 'Válido', '2023-11-20', '2025-11-20', 'Contrato de manutenção preventiva e corretiva dos elevadores das torres A e B.', '1.8 MB'),
  ('Apolice de Seguro Predial.pdf', 'Seguros', 'Vencido', '2023-01-10', '2024-01-10', 'Apólice anual contra incêndio, raios e danos estruturais. Necessita renovação urgente.', '4.1 MB'),
  ('Atas de Assembleia 2023.pdf', 'Atas', 'Válido', '2024-01-05', NULL, 'Compilado de todas as decisões tomadas em assembleias ordinárias de 2023.', '15.6 MB'),
  ('Processo Judicial n 10023.pdf', 'Jurídico', 'Pendente', '2024-02-01', NULL, 'Acompanhamento jurídico referente à dívida ativa da unidade 402.', '850 KB')
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documentos_category ON public.documentos_juridicos(category);
CREATE INDEX IF NOT EXISTS idx_documentos_status ON public.documentos_juridicos(status);