-- 1. Tabela de Perfis (Vinculada ao auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT,
  role TEXT CHECK (role IN ('admin', 'resident', 'manager')) DEFAULT 'resident',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Encomendas
CREATE TABLE encomendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES profiles(id),
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('pendente', 'entregue')) DEFAULT 'pendente',
  received_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Reservas
CREATE TABLE reservas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES profiles(id),
  area_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('pendente', 'aprovada', 'rejeitada')) DEFAULT 'pendente'
);

-- 4. Visitantes
CREATE TABLE visitantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT,
  expected_arrival TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('aguardando', 'dentro', 'saido')) DEFAULT 'aguardando'
);

-- 5. Ocorrencias
CREATE TABLE ocorrencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('aberta', 'em_analise', 'resolvida')) DEFAULT 'aberta',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 6. Manutencao
CREATE TABLE manutencao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('agendada', 'em_andamento', 'concluida')) DEFAULT 'agendada'
);

-- 7. Assembleias
CREATE TABLE assembleias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('agendada', 'ocorrendo', 'encerrada')) DEFAULT 'agendada'
);

-- 8. Financeiro
CREATE TABLE financeiro (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pendente', 'pago', 'atrasado')) DEFAULT 'pendente'
);

-- 9. Documentos
CREATE TABLE documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
