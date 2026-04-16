-- Migration: Create manual_sindico tables
-- Date: 2026-04-15

-- 1. Manual Categories (Technicals)
CREATE TABLE IF NOT EXISTS public.manual_categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Technical Items
CREATE TABLE IF NOT EXISTS public.manual_tecnicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.manual_categorias(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Improvement Ideas
CREATE TABLE IF NOT EXISTS public.melhorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('voting', 'planning', 'approved', 'rejected', 'completed')) DEFAULT 'voting',
  manager TEXT,
  request_date DATE,
  estimated_cost DECIMAL(12,2),
  implementation_date DATE,
  real_cost DECIMAL(12,2),
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tool/Asset Inventory
CREATE TABLE IF NOT EXISTS public.ferramentas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')) DEFAULT 'available',
  status_reason TEXT,
  last_update DATE,
  category TEXT NOT NULL,
  location TEXT,
  quantity INTEGER DEFAULT 1,
  unit_label TEXT DEFAULT 'Unidade',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Asset History/Log
CREATE TABLE IF NOT EXISTS public.ferramentas_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ferramenta_id UUID REFERENCES public.ferramentas(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT now(),
  quantity_affected INTEGER DEFAULT 0,
  notes TEXT
);

-- RLS Policies
ALTER TABLE public.manual_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.melhorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferramentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferramentas_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all access to manual_categorias" ON public.manual_categorias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access to manual_tecnicos" ON public.manual_tecnicos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access to melhorias" ON public.melhorias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access to ferramentas" ON public.ferramentas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all access to ferramentas_log" ON public.ferramentas_log FOR ALL USING (auth.role() = 'authenticated');

-- Insert default categories
INSERT INTO public.manual_categorias (name, description, icon, order_index)
VALUES 
  ('Elétrica', 'Sistema elétrico do condomínio', 'fa-bolt', 1),
  ('Hidráulica', 'Sistema hidráulico e saneamento', 'fa-water', 2),
  ('Incêndio', 'Prevenção e combate a incêndio', 'fa-fire-extinguisher', 3),
  ('Elevadores', 'Manutenção de elevadores', 'fa-elevator', 4),
  ('Jardim', 'Paisagismo e irrigação', 'fa-leaf', 5),
  ('Piscina', 'Tratamento e manutenção', 'fa-swimming-pool', 6)
ON CONFLICT DO NOTHING;

-- Insert sample tools
INSERT INTO public.ferramentas (code, name, status, last_update, category, location, quantity, unit_label)
VALUES 
  ('INS-012', 'Telhas', 'available', '2026-01-10', 'Insumos', 'Depósito Geral', 10, 'Saco'),
  ('JAR-005', 'Cortador de grama', 'maintenance', '2026-01-05', 'Jardim', 'Zeladoria', 1, 'Unidade'),
  ('FER-042', 'Broca Bosch Impacto', 'available', '2026-01-08', 'Ferramentas', 'Armário 01', 1, 'Unidade'),
  ('INS-008', 'Cloro estabilizante 10kg', 'available', '2026-01-12', 'Insumos', 'Depósito piscina', 5, 'Saco')
ON CONFLICT DO NOTHING;

-- Insert sample improvements
INSERT INTO public.melhorias (title, category, image_url, description, likes, dislikes, status, manager, request_date, estimated_cost)
VALUES 
  ('Energia Solar nas Áreas Comuns', 'Sustentabilidade', 'https://images.unsplash.com/photo-1509391366360-fe5bb58583bb?auto=format&fit=crop&w=600&q=80', 'Instalação de painéis fotovoltaicos para reduzir a taxa de condomínio em 30%.', 24, 2, 'voting', 'Eduardo (Admin)', '2026-01-10', 45000),
  ('Revitalização do Playground', 'Infraestrutura', 'https://images.unsplash.com/photo-1594918738302-36940d99d123?auto=format&fit=crop&w=600&q=80', 'Troca de brinquedos antigos por materiais sustentáveis.', 15, 8, 'planning', 'Eduardo (Admin)', '2026-02-05', 12000)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ferramentas_category ON public.ferramentas(category);
CREATE INDEX IF NOT EXISTS idx_ferramentas_status ON public.ferramentas(status);
CREATE INDEX IF NOT EXISTS idx_melhorias_status ON public.melhorias(status);
CREATE INDEX IF NOT EXISTS idx_ferramentas_log_ferramenta_id ON public.ferramentas_log(ferramenta_id);