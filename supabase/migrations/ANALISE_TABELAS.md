-- Análise de Tabelas: Legadas vs Novas
-- ============================================

-- RESUMO:
-- O arquivo database_schema.sql contém a estrutura original ANTES da integração
-- As migrations criaram NOVAS tabelas com campos enhanced

-- ============================================
-- TABELAS ANTIGAS (do database_schema.sql)
--Podem ser DELETADAS após migração:
-- ============================================

-- 1. reservas (ANTIGA) → area_id, user_id não tem
--    NOVA: areas + reservations (migrations 001)

-- 2. ocorrencias (ANTIGA) → apenas title, description
--    NOVA: occurrences (migration 002) com main_type, urgency, observation

-- 3. visitantes (ANTIGA) → só name, document  
--    NOVA: visitors (migration 004) com visitor_rg, visitor_cpf, qr_code, host_name, etc

-- 4. financeiro (ANTIGA) → só amount, due_date
--    NOVA: financial_entries (migration 006) com entry_type, category, payment_method, receipt_url

-- ============================================
-- TABELAS ATIVAS (das migrations)
-- Manter estas:
-- ============================================
-- areas          → catálogo de áreas comuns
-- reservations → reservas de áreas
-- occurrences  → reclamações e ocorrências  
-- visitors      → controle de visitantes com QR
-- vehicle_tags → veículos LPR
-- financial_entries → lançamentos financeiros
-- balance_history → histórico de saldo
-- financial_audit → auditoria

-- ============================================
-- Para deletar as ANTIGAS:
-- ============================================
/*
-- Execute no Supabase SQL Editor para excluir tabelas legadas:
DROP TABLE IF EXISTS reservas;
DROP TABLE IF EXISTS ocorrencias;
DROP TABLE IF EXISTS visitantes;
DROP TABLE IF EXISTS financeiro;
*/

-- ============================================
-- Verificar quais tabelas existem:
-- ============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;