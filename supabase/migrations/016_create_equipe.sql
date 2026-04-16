-- Migration: Create equipe (staff/RH) and epis tables
-- Date: 2026-04-15

-- 1. Equipe table (Staff Members)
CREATE TABLE IF NOT EXISTS public.equipe (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_external_id TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  rg TEXT,
  status TEXT CHECK (status IN ('active', 'dismissed')) DEFAULT 'active',
  admission_date DATE,
  photo_url TEXT,
  street TEXT,
  street_number TEXT,
  neighborhood TEXT,
  city TEXT,
  marital_status TEXT,
  children_count INTEGER DEFAULT 0,
  vacation_start DATE,
  vacation_end DATE,
  thirteenth_salary_status TEXT CHECK (thirteenth_salary_status IN ('paid', 'pending', 'nao_se_aplica')) DEFAULT 'pending',
  dismissal_date DATE,
  dismissal_reason TEXT,
  dismissal_pendencies TEXT,
  dismissal_is_paid BOOLEAN DEFAULT false,
  dismissal_date_of_payment DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. EPIs table (Equipment delivered to staff)
CREATE TABLE IF NOT EXISTS public.epis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES public.equipe(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT CHECK (status IN ('regular', 'vencido', 'faltante', 'irregular')) DEFAULT 'regular',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated access to equipe" ON public.equipe;
DROP POLICY IF EXISTS "Allow all authenticated access to epis" ON public.epis;

CREATE POLICY "Allow all authenticated access to equipe" ON public.equipe
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated access to epis" ON public.epis
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert sample staff members
INSERT INTO public.equipe (name, role, phone, rg, status, admission_date, photo_url, thirteenth_salary_status, street, street_number, neighborhood, city, marital_status, children_count)
VALUES 
  ('RICARDO DIAS', 'Zelador', '11999990001', '12.345.678-9', 'active', '2020-02-15', 'https://i.pravatar.cc/150?u=ricardo', 'paid', 'Rua das Flores', '123', 'Centro', 'São Paulo', 'Casado(a)', 2),
  ('SUELI GOMES', 'Limpeza', '11999990002', '23.456.789-0', 'active', '2022-08-20', 'https://i.pravatar.cc/150?u=sueli', 'paid', 'Rua das Orquídeas', '456', 'Jardim das Flores', 'São Paulo', 'Solteiro(a)', 0),
  ('MARCOS SILVA', 'Jardineiro', '11999990003', '30.000.050-50', 'dismissed', '2023-01-10', 'https://i.pravatar.cc/150?u=marcos', 'pending', 'Rua Arantes', '555', 'Carrrabas', 'São Paulo', 'Solteiro(a)', 0),
  ('CARLOS SANTOS', 'Segurança Noturno', '11999990004', '40.567.890-1', 'active', '2021-11-01', 'https://i.pravatar.cc/150?u=carlos', 'paid', 'Rua Principal', '789', 'Centro', 'São Paulo', 'Casado(a)', 1)
ON CONFLICT DO NOTHING;

-- Insert sample EPIs
INSERT INTO public.epis (staff_id, name, delivery_date, expiry_date, status)
SELECT e.id, 'Botas de PVC', '2025-05-10'::date, '2026-05-10'::date, 'regular' FROM public.equipe e WHERE e.name = 'RICARDO DIAS'
UNION ALL
SELECT e.id, 'Luvas de borracha', '2025-05-10'::date, '2025-11-10'::date, 'regular' FROM public.equipe e WHERE e.name = 'RICARDO DIAS'
UNION ALL
SELECT e.id, 'Luvas de borracha', '2025-06-15'::date, '2025-12-15'::date, 'regular' FROM public.equipe e WHERE e.name = 'SUELI GOMES'
UNION ALL
SELECT e.id, 'Botas de PVC', '2025-06-15'::date, '2026-06-15'::date, 'regular' FROM public.equipe e WHERE e.name = 'SUELI GOMES'
UNION ALL
SELECT e.id, 'Protetor Auricular', '2025-01-20'::date, '2025-07-20'::date, 'vencido' FROM public.equipe e WHERE e.name = 'MARCOS SILVA'
UNION ALL
SELECT e.id, 'Óculos de Proteção', '2025-01-20'::date, '2026-01-20'::date, 'regular' FROM public.equipe e WHERE e.name = 'MARCOS SILVA'
UNION ALL
SELECT e.id, 'Lanterna', '2024-12-05'::date, '2025-06-05'::date, 'vencido' FROM public.equipe e WHERE e.name = 'CARLOS SANTOS'
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_equipe_status ON public.equipe(status);
CREATE INDEX IF NOT EXISTS idx_equipe_role ON public.equipe(role);
CREATE INDEX IF NOT EXISTS idx_epis_staff_id ON public.epis(staff_id);
CREATE INDEX IF NOT EXISTS idx_epis_status ON public.epis(status);