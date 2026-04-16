-- Migration: Create areas and reservations tables for condominium common areas management
-- Run this in Supabase SQL Editor

-- 1. Create areas table (Áreas Comuns)
CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image TEXT,
  capacity INTEGER DEFAULT 20,
  tax DECIMAL(10,2) DEFAULT 0,
  description TEXT,
  rules TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resident_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  area_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reservations_area_date ON reservations(area_id, date);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);

-- 5. Policies for areas table
-- Everyone can view active areas
CREATE POLICY "Anyone can view active areas" ON areas
  FOR SELECT
  USING (is_active = true);

-- Only admins can modify areas
CREATE POLICY "Admins can manage areas" ON areas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Policies for reservations
-- Users can view reservations in their unit
CREATE POLICY "Users can view own unit reservations" ON reservations
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR unit IN (SELECT unit FROM profiles WHERE id = auth.uid())
  );

-- Users can create their own reservations
CREATE POLICY "Users can create reservations" ON reservations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can cancel their own reservations
CREATE POLICY "Users can cancel own reservations" ON reservations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (status = 'cancelled');

-- Admins can view all reservations
CREATE POLICY "Admins can view all reservations" ON reservations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all reservations
CREATE POLICY "Admins can manage all reservations" ON reservations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Insert default areas (only if empty)
INSERT INTO areas (name, image, capacity, tax, description, rules, is_active)
SELECT * FROM (VALUES
  ('Academia', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80', 20, 0, 'Equipamentos modernos para musculação e cardio. Ar-condicionado e sonorização inclusos.', ARRAY['Uso obrigatório de toalha', 'Limite de 60 minutos por aparelho em horários de pico', 'Proibido circular sem camisa'], true),
  ('Academia Ar Livre', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=80', 20, 0, 'Espaço aberto para exercícios funcionais e alongamento integrado com a natureza do condomínio.', ARRAY['Uso livre para moradores', 'Mantenha o distanciamento', 'Zele pelos equipamentos fixos'], true),
  ('Auditório', 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80', 50, 150, 'Perfeito para reuniões de negócios, palestras ou eventos corporativos de pequeno porte.', ARRAY['Reserva mínima de 2 horas', 'Proibido consumo de alimentos pesados', 'Taxa de limpeza inclusa no valor'], true),
  ('Brinquedoteca', 'https://images.unsplash.com/photo-1566411520896-01e7ca4726af?auto=format&fit=crop&w=600&q=80', 15, 0, 'Espaço lúdico e seguro para crianças de 2 a 10 anos.', ARRAY['Crianças devem estar acompanhadas por um adulto', 'Proibido calçados no tapete', 'Mantenha os brinquedos organizados após o uso'], true),
  ('Churrasqueira', 'https://images.unsplash.com/photo-1529193591184-b1d58b34ecdf?auto=format&fit=crop&w=600&q=80', 30, 80, 'Ambiente completo com grelha, forno de pizza e mesas. Ideal para reunir família e amigos.', ARRAY['Limpeza por conta do morador ou contratação à parte', 'Som em volume moderado até as 22h', 'Taxa de uso para gás e manutenção'], true),
  ('Salão de Festas', 'https://images.unsplash.com/photo-1530103043960-ef38714abb15?auto=format&fit=crop&w=600&q=80', 100, 350, 'Amplo salão climatizado com cozinha completa, mesas e cadeiras de alto padrão.', ARRAY['Entrega das chaves mediante vistoria', 'Taxa de manutenção obrigatória', 'Uso de som profissional proibido sem autorização prévia'], true)
) AS areas(name, image, capacity, tax, description, rules, is_active)
WHERE NOT EXISTS (SELECT 1 FROM areas LIMIT 1);