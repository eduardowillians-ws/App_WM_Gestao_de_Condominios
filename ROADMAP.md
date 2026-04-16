# 🗺️ Roadmap de Implementação - Projeto Condomínio

Este é o mapa para as próximas sessões de desenvolvimento, evidenciando o que já está completo, validado em produção, e os blocos faltantes.

## ✅ FASE 1: Fundação Estrutural e Arquitetura de Nuvem (CONCLUÍDO)
- [x] Configuração da plataforma (React, Vite, Tailwind CSS).
- [x] Criação de Views, navegação e Dashboard visual.
- [x] Arquitetura base do Supabase (tabela `profiles`, link com `auth.users`).
- [x] Trigger automático do Postgres (Cria perfil em branco no Auth).
- [x] Database Hook de Roles Injetadas no Token JWT.

## 🔐 ✅ FASE 2: Experiência Autônoma do Morador (CONCLUÍDO / EM VALIDAÇÃO)
- [x] Lógica de tela "Moradores" para Síndico convidar as pessoas via Edge Function (`invite_resident`).
- [x] Edge Function lidando graciosamente com o redirecionamento local ou online e tratando limites de email.
- [x] Tela de "Meu Perfil" do Morador com preenchimento obrigatório e máscaras de dados.
- [x] Criação de fluxo onde o titular (Pai da Casa) gerencia os familiares e cadastra co-moradores para a mesma residência. *(Sendo implementado / Validado)*

## 🚧 FASE 3: Vida Cotidiana e Operações de Base (PRÓXIMOS PASSOS)
**Estes sistemas possuem UI pronta em MOCKS, necessitam de Criação de Tabela e Banco de Dados Real no Supabase:**
- [ ] **Módulo de Reservas de Área:** 
   - Criar tabelas `areas` e `reservations`.
   - Regras de Segurança (RLS): Somente o próprio residente vê suas reservas, Síndico vê todas. Morador só agenda áreas disponíveis na data.
- [ ] **Módulo de Ocorrências de Manutenção:**
   - Criar tabelas de SAC / Tickets (Abertos, Em Andamento, Fechados).
   - Somente admin e o autor conseguem ver o chamado preventivo.

## 🚀 FASE 4: Módulo de Portaria e Portão (FUTURO)
- [ ] **Gestão de Controle de Acesso e Visitantes:**
   - Tela para o Titular enviar um QrCode / Link mágico autorizando uma visita.
   - Tela do Porteiro (Zelador) validando entradas.
   - Controle de Pacotes (Correios) e notificação por push/e-mail para os moradores.

## 🏦 FASE 5: Ferramentas Administrativas Pro (DOCUMENTAÇÃO/ASSEMBLEIAS)
- [ ] **Financeiro & Assembleias:** 
   - Criação de enquetes anônimas atreladas a uma uníca Unidade (1 Voto por Unidade).
   - Inserção de Boletos pelo Síndico atrelados ao morador.
