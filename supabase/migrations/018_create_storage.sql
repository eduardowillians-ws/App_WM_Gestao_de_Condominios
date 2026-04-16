-- Migration: Create storage buckets for documents and photos
-- Date: 2026-04-15

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documentos', 'documentos', true, 52428800, '{"application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"}'),
  ('fotos', 'fotos', true, 10485760, '{"image/jpeg", "image/png", "image/webp"}')
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage
CREATE POLICY "Allow public read access to documentos" ON storage.objects
  FOR SELECT USING (bucket_id = 'documentos');

CREATE POLICY "Allow public read access to fotos" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos');

CREATE POLICY "Allow authenticated users to upload to documentos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documentos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to upload to fotos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'fotos' AND auth.role() = 'authenticated');