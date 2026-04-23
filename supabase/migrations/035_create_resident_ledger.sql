-- Migration: Create resident_ledger table for financial management of residents
-- Date: 2026-04-23

CREATE TABLE IF NOT EXISTS public.resident_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  resident_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  type TEXT DEFAULT 'rent' CHECK (type IN ('rent', 'condo_fee', 'other')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resident_ledger ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all ledger entries" 
  ON public.resident_ledger FOR ALL 
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

CREATE POLICY "Residents can view own ledger entries" 
  ON public.resident_ledger FOR SELECT 
  USING (profile_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ledger_profile ON public.resident_ledger(profile_id);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON public.resident_ledger(status);
CREATE INDEX IF NOT EXISTS idx_ledger_due_date ON public.resident_ledger(due_date);
