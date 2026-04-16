-- Fix: Add missing columns to manutencao table if they don't exist
-- Date: 2026-04-15

-- Add date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manutencao' AND column_name = 'date'
  ) THEN
    ALTER TABLE public.manutencao ADD COLUMN date DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Add time column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manutencao' AND column_name = 'time'
  ) THEN
    ALTER TABLE public.manutencao ADD COLUMN time TIME NOT NULL DEFAULT '09:00:00';
  END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manutencao' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.manutencao ADD COLUMN status TEXT DEFAULT 'scheduled';
  END IF;
END $$;

-- Add responsible column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manutencao' AND column_name = 'responsible'
  ) THEN
    ALTER TABLE public.manutencao ADD COLUMN responsible TEXT;
  END IF;
END $$;

-- Add invoice_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'manutencao' AND column_name = 'invoice_url'
  ) THEN
    ALTER TABLE public.manutencao ADD COLUMN invoice_url TEXT;
  END IF;
END $$;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_manutencao_date ON public.manutencao(date);