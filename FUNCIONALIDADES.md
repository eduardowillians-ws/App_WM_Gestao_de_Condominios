# 🏢 WM Gestão de Condomínios - Funcionalidades do Sistema

Este documento serve como a **Bíblia de Funcionalidades** da plataforma.

---

## 🔐 1. Módulo de Segurança e Acesso
- **Autenticação Real:** Sistema de login seguro 100% integrado ao Supabase Auth.
- **Autorização Baseada em Regras (RLS):** `admin`, `manager`, `resident`.
- **Magic Links e Convites:** Envio de convites via e-mail.

---

## 🏠 2. Painel Central (Dashboard)
- **Visão Geral:** Métricas macro do condomínio.
- **Gráficos Dinâmicos:** Recharts.
- **Modos de Visão:** Admin vs Residente.

---

## 👨‍👩‍👧‍👦 3. Gestão de Moradores
- **Estruturação de Planta:** Blocos e apartamentos.
- **Convites Seguros:** Síndico digita Nome, Email, Unidade.
- **Listagem e Buscas:** Grade com filtros.
- **Máscaras:** RG, CPF, Celular.

---

## 📊 2.1 Painel Geral (Dashboard)
- **Filtros:** Mês, Ano, Unidades (torres/blocos)
- **Dados em tempo real do banco:**

| Métrica | Tabela | Coluna filtro |
|--------|--------|--------------|
| Moradores Ativos | profiles | created_at |
| Ocorrências | occurrences | date |
| Encomendas | encomendas | received_at |
| Torres/Blocos | condo_blocks | id, name, total_units |

- **Lógica de filtros:**
  - Ano = "Todos os Anos" → mostra todos os dados
  - Ano = ano específico → filtra de 01-01 até 12-31 daquele ano
  - Torres → filtra por block_id

- **Migrações:** 
  - `021_create_condo_blocks.sql` - Tabela de blocos/torres
  - `022_add_exit_date_to_profiles.sql` - Data de saída moradores
  - `023_add_all_profiles_columns.sql` - Colunas extras profiles
  - `024_create_access_logs.sql` - Tabela de logs de acesso

### 2.1.1 Fluxo de Acessos
- **Tabela:** `access_logs`
- **Campos:** access_type, direction, block_id, unit, name, document, reason, created_at
- **Tipos:** MORADOR, VISITANTE, PRESTADOR, ENTREGA
- **Direção:** ENTRY, EXIT
- **Gráfico:** Dados reais por dia (entry dos moradores vs visitantes)
- **Fallback:** Dados aleatórios se tabela vazia

---

## 👤 4. "Meu Perfil"
- **CPF, RG, Telefone, Profissão:** Preenchimento rigoroso.
- **Profissões Inteligentes:** Auto-capitalização + datalist.
- **Autogestão de Senhas.**
- **Gestão de Familiares e Dependentes.**
- **Upload de Foto** com preview.

---

## 📅 5. Sistema de Reservas de Áreas Comuns ✅ COMPLETO
- **Catálogo de áreas** com fotos, capacidade, taxa.
- **Integração Supabase** completa.
- **Calendário mensal** interativo.
- **Indicadores visuais** de dias com reservas.
- **Seleção de múltiplos horários**.
- **Verificação de disponibilidade** em tempo real.
- **Cálculo dinâmico de taxa**.
- **Admin** cria/edita/exclui áreas.
- **Migration:** `001_create_areas_and_reservations.sql`

---

## 👥 6. Sistema de Visitantes e Controle de Acesso ✅ COMPLETO
- **QR Code Digital** com informações completas.
- **Dados do Visitante:** Nome, RG, CPF.
- **Compartilhamento via WhatsApp.**
- **Modal responsivo** (PC, celular, tablet).
- **Veículos TAG (LPR)** com seleção de vaga.
- **Bloco/Unidade dinâmico** + busca nome do morador.
- **Soft Delete** para veículos.
- **Auditoria** de acessos.
- **Migration:** `004_create_visitors_and_vehicles.sql` + `005_update_visitors.sql`

---

## 🛠️ 7. Sistema de Ocorrências e Manutenção ✅ COMPLETO
- **Reclamações:** barulho, convivência, estacionamento.
- **Ocorrências:** manutenção, piscina, bomba d'água.
- **Prioridades:** baixa, média, alta.
- **Integração Supabase.**
- **Atualização de status** (Admin/Zelador).
- **Observações** de resposta.
- **Modal responsivo.**
- **Migration:** `002_create_occurrences.sql`

---

## 💰 8. Módulo Financeiro ✅ COMPLETO
- **Receitas e Despesas** com categorias.
- **Gráficos** receita vs despesa.
- **Filtros** por mês/ano/categoria.
- **Anexo de comprovantes.**
- **Cálculo automático de inadimplência.**
- **Auditoria completa** (quem criou/cancelou).
- **Apenas admin** pode editar/excluir.
- **Migration:** `006_create_financial.sql` + `007_create_financial_audit.sql`

### Auditoria Financeira
- **Tabela:** `financial_audit`
- Registra: CREATE, UPDATE, DELETE, VIEW
- Campos: entry_id, user_id, old_value, new_value, notes
- Permite rastrear erros e correções

---

## 👥 9. Gestão de Moradores (Soft Delete) ✅ COMPLETO
- **Remoção preserva dados históricos.**
- **Campo `exit_date`** para data de saída.
- **Status `active` / `inactive`.**
- **Migration:** `003_add_profile_status.sql`

---

## 🗳️ 10. Assembleias Online ✅ COMPLETO
- **Criação de assembleias** (Ordinária/Extraordinária).
- **Período de votação** (início/término).
- **Votação online** (Aprovo/Rejeito/Abstención).
- **Verificação de vote único** por usuário.
- **Resultado em tempo real**.
- **Quórum automático** (baseado em moradores ativos).
- **Encerramento** (admin).
- **Auditoria** de quem criou/encerrou/votou.
- **Apenas admin/manager** pode criar/encerrar.
- **Migration:** `008_create_assemblies.sql`

### Fluxo:
1. Síndico cria assembleia (tipo, período, descrição)
2. Moradores votam (1 voto por pessoa)
3. Sistema conta votos em tempo real
4. Admin encerra e publica ata

---

## 📋 11. Utils e Compressão
- **`lib/utils.ts`**:
  - `compressImage()` - comprime imagens
  - `uploadFile()` - upload com compressão
  - `formatCurrency()`, `formatCPF()`, `formatRG()`, etc.

---

## 📄 15. Documentos / Jurídico ✅ COMPLETO
- **Upload de documentos** com armazenamento em Supabase Storage.
- **Categorias:** Regimento, Atas, Contratos, Seguros, Jurídico.
- **Status:** Válido, Vencido, Pendente, Arquivado.
- **Filtros por:** categoria, status, busca por nome/descrição.
- **Visualização** de documentos via link direto.
- **Ações:** Arquivar, Restaurar, Validar, Excluir.
- **Migration:** `017_create_documentos.sql` + `018_create_storage.sql`

---

## 📘 16. Manual do Síndico ✅ COMPLETO
- **Categorias Técnicas:** Elétrica, Hidráulica, Incêndio, Elevadores, Jardim, Piscina.
- **Banco de Conhecimento:** Textos e informações técnicas por categoria.
- **Ideias de Melhoria:** Propostas de moradores com votação.
- **Controle de Ferramentas/Ativos:** Inventário do depósito com histórico.
- **Migration:** `019_create_manual_sindico.sql` + `020_add_image_to_manual_categorias.sql`

### 16.1 Depósito / Insumos (Almoxarifado)
- **Integração Supabase:** Dados persistem após F5
- **Cadastro de ativos:** Nome, categoria, localização, quantidade, unidade
- **Controle de estoque:** Retirada, Uso, Devolução, Reparo
- **Histórico de movimentações:** Log completo por item
- **Padrão de texto:** Formatação automática (PascalCase)
- **Listas sugeridas:** Equipamentos, locais, unidades pré-definidos
- **Tabelas:** `ferramentas`, `ferramentas_log`
- **Upload com compressão:** Imagens comprimidas antes de salvar

### 16.2 Projetos de Melhoria
- **Sugerir Projeto:** Título, categoria, custo, descrição, upload de imagem
- **Votação:** Like/Dislike único por usuário (localStorage)
- **Concluir/Aprovar Projeto:** Data implementação, custo real, status
- **Reprovar Projeto:** Motivo, observação
- **Histórico:** Projetos concluídos e reprovados filtrados
- **Edição admin:** Permite alterar projeto, registra responsável
- **Upload com compressão:** Imagens do projeto comprimidas
- **Tabelas:** `melhorias`
- **Migration:** `019_create_manual_sindico.sql`

### 16.3 Manual Técnico
- **Categorias técnicas:** Upload de foto de capa
- **Integração Supabase:** Fotos persistem após F5
- **Compressão de imagem:** Fotos comprimidas antes de salvar
- **Edição admin:** Alterar título, descrição, foto
- **Tabelas:** `manual_categorias`, `manual_tecnicos`
- **Migration:** `019_create_manual_sindico.sql` + `020_add_image_to_manual_categorias.sql`

---

## 📊 Migrations SQL Executadas
```bash
001_create_areas_and_reservations.sql  ✅
002_create_occurrences.sql            ✅
003_add_profile_status.sql           ✅
004_create_visitors_and_vehicles.sql  ✅
005_update_visitors.sql              ✅
006_create_financial.sql            ✅
007_create_financial_audit.sql       ✅
008_create_assemblies.sql           ✅
009_update_encomendas.sql           ✅
010_encomendas_rls.sql             ✅
011_create_manutencao.sql          ✅
012_fix_manutencao_columns.sql     ✅
013_fix_manutencao.sql            ✅
014_fix_status_constraint.sql     ✅
015_add_timestamps_manutencao.sql  ✅
016_create_equipe.sql             ✅
017_create_documentos.sql       ✅
018_create_storage.sql           ✅
019_create_manual_sindico.sql    ✅
020_add_image_to_manual_categorias.sql ✅
021_create_condo_blocks.sql      ✅
022_add_exit_date_to_profiles.sql ✅
023_add_all_profiles_columns.sql ✅
024_create_access_logs.sql     ✅
```

---

## 📝 Histórico de Alterações
- **v1.0 (2026-01)** - Versão inicial
- **v1.1 (2026-04)** - Integração Supabase + Calendário Reservas
- **v1.2 (2026-04)** - Visitantes QR + Vehicles TAG
- **v1.3 (2026-04)** - Módulo Financeiro + Auditoria
- **v1.4 (2026-04)** - Assembleias Online + Limpeza tabelas legadas
- **v1.5 (2026-04)** - Encomendas com Bloco/Unidade + WhatsApp
- **v1.6 (2026-04)** - Gestão Operacional (Manutenção + Certificados + Filtros)
- **v1.7 (2026-04)** - Equipe/RH/EPIs com Supabase
- **v1.8 (2026-04)** - Documentos/Jurídicos com Upload + Manual Síndico
- **v1.9 (2026-04)** - Depósito/Insupos integrado Supabase + Melhorias com votação + Manual Técnico com foto
- **v2.0 (2026-04)** - Dashboard com dados reais do banco (filtros por data)

### v2.0 - Detalhes das alterações no Dashboard:
- ✅ Moradores ativos: filtro por created_at
- ✅ Ocorrências: filtro por date  
- ✅ Encomendas: filtro por received_at
- ✅ Torres/Blocos: dados de condo_blocks
- ✅ Occupation graph: cálculo real (moradores/unidades)
- ✅ Default filtros: "Todos os Meses" + "Todos os Anos"
- ✅ Fluxo de Acessos: dados reais de access_logs

### v2.1 - Tabela de Access Logs:
- ✅ Nova tabela access_logs para registrar entradas/saídas
- ✅ Tipos: MORADOR, VISITANTE, PRESTADOR, ENTREGA
- ✅ Campos: block_id, unit, name, document, direction, created_at
- ✅ Integração com gráfico de fluxo de acessos

### v2.2 - Formulário de Registro de Acesso:
- ✅ Botão "Registrar Morador" com seleção em cascata: Bloco → Apartamento → Morador
- ✅ Botão "Registrar Visitante" com mesma lógica de apartamentos
- ✅ Máscara de documento (CPF/RG) com seletor de tipo
- ✅ Preenchimento automático de profile_id e CPF do morador

### v2.3 - Ocorrências e Reclamações Separadas:
- ✅ Card "Ocorrências": Total, Pendentes, Concluídas (dados reais)
- ✅ Card "Reclamações": Total, Pendentes, Concluídas (dados reais)
- ✅ Filtros de mês/ano funcionando corretamente

### v2.4 - KPIs do Nível de Gestão com Dados Reais:
- ✅ Saúde Financeira: saldo de financial (receitas - despesas)
- ✅ Ocupação: percentual real (moradores/unidades)
- ✅ Taxa de Ocorrências: pendentes reais
- ✅ Crescimento de Áreas: reservas do mês atual
- ✅ Eficiência Logística: encomendas pendentes +5 dias