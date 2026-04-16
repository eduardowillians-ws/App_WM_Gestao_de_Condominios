-- Migration: Add image column to manual_categorias
-- Date: 2026-04-15

-- Add image column
ALTER TABLE public.manual_categorias 
ADD COLUMN IF NOT EXISTS image TEXT;

-- Add mandatory column  
ALTER TABLE public.manual_categorias
ADD COLUMN IF NOT EXISTS mandatory BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_manual_categorias_order ON public.manual_categorias(order_index);