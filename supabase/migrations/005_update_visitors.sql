-- Migration: Update visitors table with new fields
-- Run this in Supabase SQL Editor

-- Add new columns to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS visitor_rg TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS visitor_cpf TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS host_name TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS host_unit TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS host_block TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS qr_code TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS qr_expires_at TIMESTAMPTZ;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Add index for QR code lookup
CREATE INDEX IF NOT EXISTS idx_visitors_qr ON visitors(qr_code);