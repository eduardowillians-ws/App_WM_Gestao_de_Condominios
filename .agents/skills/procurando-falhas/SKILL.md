---
name: procurando-falhas
description: Realiza varreduras de segurança, pesquisa vulnerabilidades no código, falhas de RLS e problemas de permissão. Use para auditar o projeto.
---
# Procurar Falhas (Security Scanner)

## Quando usar esta skill
- O usuário pedir uma auditoria ou varredura de vulnerabilidades no projeto.
- Houver suspeita de vazamento de dados, falhas de RLS (Row Level Security) ou problemas de autenticação.
- O usuário pedir para validar a segurança das chamadas de API ou do banco de dados.

## Fluxo de Trabalho (Workflow)
1. **Levantamento de Posição**: Identifique pontos críticos do sistema:
   - Funções de API (ex. rotas sensíveis sem verificação de token).
   - Políticas RLS no Supabase.
   - Variáveis de ambiente sensíveis expostas.
2. **Inspeção de Código**: Busque padrões de strings soltas, dependências desatualizadas ou injeção de SQL.
3. **Auditoria de Banco de Dados**: Verifique se todas as tabelas sensíveis possuem o RLS ativado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
4. **Correção (Patching)**: Sugira correções pontuais para cada vulnerabilidade e aplique as mudanças assim que o usuário aprovar.

## Instruções
- Use `grep_search` focado em palavras-chave como `auth`, `token`, `secret`, `bypass`, `RLS`, `public`.
- No Supabase, execute `mcp_supabase-mcp-server_get_advisors` para capturar relatórios dinâmicos de segurança.
- Busque proativamente políticas mal formuladas, como `USING (true)` em tabelas base onde informações privadas estão presentes.

## Recursos
- Ferramenta `mcp_supabase-mcp-server_get_advisors`
