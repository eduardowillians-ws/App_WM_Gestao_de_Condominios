-- Migration: Update encomendas table with new fields for block/unit selection and notifications
-- Date: 2026-04-15

-- Add tracking_code column
ALTER TABLE public.encomendas 
ADD COLUMN IF NOT EXISTS tracking_code TEXT;

-- Add notified_at column for WhatsApp notification timestamp
ALTER TABLE public.encomendas 
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- Add delivered_at column for delivery timestamp
ALTER TABLE public.encomendas 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Ensure profile_id exists and has proper constraint
ALTER TABLE public.encomendas 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Rename status values to match app expectations if needed
-- Current: 'pendente', 'entregue' -> Expected: 'pending', 'delivered'

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_encomendas_profile_id ON public.encomendas(profile_id);
CREATE INDEX IF NOT EXISTS idx_encomendas_status ON public.encomendas(status);
CREATE INDEX IF NOT EXISTS idx_encomendas_received_at ON public.encomendas(received_at);