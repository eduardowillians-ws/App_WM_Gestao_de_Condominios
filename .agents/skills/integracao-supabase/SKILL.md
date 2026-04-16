---
name: integracao-supabase
description: Estrutura, integra e gerencia banco de dados Supabase para o projeto. Use para criar tabelas, autenticação, RLS e gerenciar migrações.
---
# Integração Supabase (Supabase Integrator)

## Quando usar esta skill
- O usuário solicitar a integração do projeto com o Supabase.
- For necessário criar ou alterar tabelas, políticas de RLS e funções de banco de dados.
- O usuário mencionar autenticação, webhooks ou migrations no Supabase.

## Fluxo de Trabalho (Workflow)
1. **Analisar o Projeto**: Ler o código atual (ex. `schema.sql`, definições de tipos) para entender o que precisa ser criado.
2. **Definir Estrutura**: Mapear as tabelas, relacionamentos (Foreign Keys) e níveis de acesso.
3. **Criar Políticas (RLS)**: Definir políticas consistentes para garantir a segurança dos dados.
4. **Gerenciar `auth`**: Configurar triggers de banco para sync com `auth.users` e hooks de JWT (caso aplicável).
5. **Validar**: Consultar as tabelas criadas usando as ferramentas MCP do Supabase (`list_tables`, `execute_sql`).

## Instruções
- Priorize o uso das ferramentas do MCP `supabase-mcp-server` para operações de migração e consultas SQL.
- Sempre valide o impacto de novas regras RLS para evitar o erro clássico de "infinite recursion" (recursão infinita). Dica: use claims no JWT para resolver papéis de usuários (RBAC) ou funções seguras (security definer).
- Caso esteja lidando com migrations locais, utilize os diretórios `/supabase/migrations`.
- Teste e confirme as operações: `select * from [tabela] limit 1` para validar.

## Recursos
- Ferramentas MCP do Supabase (`mcp_supabase-mcp-server_*`)
