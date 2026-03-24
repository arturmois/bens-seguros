# F13. Formulario de Configuracao AI Agent (por Canal)

> **Esforco:** M (2-3 dias) | **Impacto:** Feature completa | **Prioridade:** Mes 1

---

## Descricao

Interface para configurar agente AI por canal de WhatsApp. Backend ja suporta (CRUD independente de AI Agents + aiAgentId no Channel), frontend precisa da UI.

## Status Atual

- Modelo `AiAgent` existe em `packages/db-chat/src/models/ai-agent.model.ts`
- Rotas CRUD de AI Agent existem em `chat-server` (criadas na feat/separate-ai-agents)
- Frontend tem pagina `Settings > Agentes IA` com tabela e form sheet
- Channel edit form tem dropdown para selecionar AI Agent
- **O que falta:** verificar se tudo esta conectado end-to-end e funcional

## Campos do AI Agent

| Campo                       | Tipo    | Descricao                              |
| --------------------------- | ------- | -------------------------------------- |
| name                        | string  | Nome do agente (ex: "Atendente Auto")  |
| description                 | string? | Descricao interna                      |
| systemPrompt                | string  | Prompt de sistema customizavel         |
| provider                    | enum    | claude-sonnet / gpt-4o                 |
| temperature                 | number  | 0.0 - 1.0 (default: 0.7)               |
| maxTokens                   | number  | Max tokens por resposta (default: 500) |
| maxResponsesPerConversation | number  | Limite de respostas (default: 10)      |
| isActive                    | boolean | Toggle habilitar/desabilitar           |

## Fluxo

1. Settings > Agentes IA → Listar agentes existentes
2. "Novo Agente" → Form sheet com campos acima
3. Settings > Canais → Editar canal → Dropdown "Agente IA" seleciona agente
4. Chat-worker busca config do agente via `channel.aiAgentId`

## Verificacao Necessaria

- [ ] Form de criacao/edicao de agente funcional
- [ ] Dropdown de selecao de agente no channel edit
- [ ] Chat-worker usa config do agente selecionado
- [ ] Prompt customizado reflete no comportamento do bot
- [ ] Deletar agente desvincula dos canais

## Criterios de Aceite

- [ ] CRUD completo de AI Agents via UI
- [ ] Associacao agente ↔ canal funcional
- [ ] Preview/teste do prompt (futuro: chat de teste)
- [ ] 4 estados UI (empty, loading, error, success)
- [ ] RBAC: ADMIN+ para gerenciar agentes
