-- Fix: Drop existing policies and recreate
-- Date: 2026-04-15

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all authenticated access to manutencao" ON public.manutencao;
DROP POLICY IF EXISTS "Allow all authenticated access to certificados" ON public.certificados_operacionais;

-- Recreate policies
CREATE POLICY "Allow all authenticated access to manutencao" ON public.manutencao
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated access to certificados" ON public.certificados_operacionais
  FOR ALL USING (auth.role() = 'authenticated');

-- Verify table structure and fix if needed
DO $$ 
BEGIN
  -- If the table doesn't have the required columns, add them
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manutencao') THEN
    -- Add columns if they don't exist (ignore errors if they do)
    BEGIN
      ALTER TABLE public.manutencao ADD COLUMN IF NOT EXISTS task TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
      ALTER TABLE public.manutencao ADD COLUMN IF NOT EXISTS area TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
      ALTER TABLE public.manutencao ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'PREVENTIVA';
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
      ALTER TABLE public.manutencao ADD COLUMN IF NOT EXISTS date DATE;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
      ALTER TABLE public.manutencao ADD COLUMN IF NOT EXISTS time TIME;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
      ALTER TABLE public.manutencao ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
      ALTER TABLE public.manutencao ADD COLUMN IF NOT EXISTS responsible TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
      ALTER TABLE public.manutencao ADD COLUMN IF NOT EXISTS invoice_url TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
  END IF;
END $$;

-- Insert default certificates if not exists
INSERT INTO public.certificados_operacionais (id, name, expiry_date, status)
VALUES 
  ('AVCB', 'AVCB - Certificado do Corpo de Bombeiros', '2026-12-31', 'valid'),
  ('AGUA', 'Análise de Qualidade da Água', '2026-12-31', 'valid')
ON CONFLICT (id) DO NOTHING;

-- Show current table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'manutencao' ORDER BY ordinal_position;