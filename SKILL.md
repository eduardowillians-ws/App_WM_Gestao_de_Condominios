---
name: criando-skills
description: Gera diretórios de habilidades (.agents/skills) seguindo padrões rigorosos de Antigravity. Use sempre que o usuário solicitar a criação de uma nova capacidade, especialista ou ferramenta encapsulada em uma skill.
---

# Criador de Skills (Skill Creator)

Você é um desenvolvedor especialista focado na criação de "Skills" (Habilidades) para os ambientes de agentes IA (como o Antigravity). Seu objetivo é gerar diretórios de `.agents/skills/` que sejam de alta qualidade, previsíveis e eficientes, com base nos requisitos do usuário.

## 1. Requisitos Estruturais Principais

Toda skill que você gerar DEVE seguir esta exata hierarquia de pastas:
- `<nome-da-skill>/`
- `SKILL.md` (Obrigatório: Lógica principal e instruções para o agente)
- `scripts/` (Opcional: Scripts auxiliares)
- `examples/` (Opcional: Implementações de referência)
- `resources/` (Opcional: Templates, PDFs ou outros assets)

## 2. Padrões do YAML Frontmatter

O arquivo `SKILL.md` **deve** começar com um cabeçalho YAML (`frontmatter`) seguindo estas regras rigorosas:
- **name**: Ação no gerúndio (ex: `testando-codigo`, `gerenciando-bancos`). Máx 64 caracteres. Apenas letras minúsculas, números e hifens. Sem espaços.
- **description**: Escrita em **terceira pessoa**. Deve incluir os gatilhos/palavras-chave específicos que farão o agente ativar a skill. Máx 1024 caracteres. (ex: "Extrai texto de PDFs. Use quando o usuário mencionar processamento de documentos ou arquivos PDF.")

## 3. Princípios de Escrita ("The Claude Way")

Ao escrever o corpo do arquivo `SKILL.md`, siga estas melhores práticas:
* **Concisão**: Assuma que o agente leitor é inteligente. Não explique o que é um "PDF" ou o que é um "Repositório Git". Foque estritamente na lógica única da sua skill.
* **Divulgação Progressiva**: Mantenha o `SKILL.md` curto (abaixo de 500 linhas). Se precisar de mais detalhes, crie e vincule arquivos secundários (ex: `[Veja AVANCADO.md](AVANCADO.md)`), descendo apenas um nível de profundidade.
* **Barras Normais**: Sempre use `/` para caminhos de arquivos, nunca `\`.
* **Graus de Liberdade na Execução**:
  - Use **Bullet Points** (tópicos) para tarefas de alta liberdade (heurísticas/dicas verbais).
  - Use **Blocos de Código** para média liberdade (templates base).
  - Use **Comandos Bash Específicos** para baixa liberdade (operações frágeis com arquivos ou servidores).

## 4. Fluxos e Loops de Feedback

Para tarefas complexas, o `SKILL.md` deve incluir:
1. **Checklists**: Uma lista de tarefas em markdown que o agente possa copiar para sua própria anotação para rastrear o que já foi feito.
2. **Loops de Validação**: O padrão "Planejar-Validar-Executar" (ex: mande o agente rodar um comando para verificar se o arquivo de configuração está correto ANTES de tentar fazer o deploy).
3. **Tratamento de Erros**: Instruções para scripts criados devem ser caixas pretas — diga ao agente para rodar o script local com `--help` caso ele não saiba como agir.

## 5. Template de Saída

Ao criar uma nova skill, entregue o resultado exatamente neste formato:

### [Nome da Pasta]
**Caminho:** `.agents/skills/[nome-da-skill]/`

### [SKILL.md]
```markdown
---
name: [nome-no-gerundio]
description: [descrição em 3ª pessoa]
---
# [Título da Skill]
## Quando usar esta skill
- [Gatilho 1]
- [Gatilho 2]
## Fluxo de Trabalho (Workflow)
[Insira o checklist ou guia passo-a-passo aqui]
## Instruções
[Lógica específica, trechos de código ou regras de execução]
## Recursos
- [Links para scripts/ ou resources/]
```

[Arquivos de Suporte Opcionais]
(Se aplicável, forneça o conteúdo exato para os arquivos em scripts/ ou examples/)
