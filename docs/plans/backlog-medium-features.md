# Backlog — Features MEDIUM (pendentes)

> Itens do `audit-medium.md` que requerem backend + frontend novos.
> Extraídos em 22/03/2026 para implementação futura com plano dedicado.

---

## M2. Redis caching para dados estáticos

**Severidade:** MEDIUM (performance)
**Esforço estimado:** Médio
**Dependência:** Redis já no stack, sem cache utils implementado

**Contexto atual:**

- Dados que mudam raramente (seguradoras, membros da org) são buscados do PostgreSQL a cada request
- Não existe cache layer no projeto — precisa criar utilities reutilizáveis

**O que implementar:**

1. Criar `packages/cache/` ou utils em `packages/shared/` com helpers Redis (get/set/invalidate)
2. Cache de seguradoras: 24h TTL, invalidar em create/update
3. Cache de membros da organização: 1h TTL, invalidar em invite/remove/role-change
4. Pattern: `cache key = entity:orgId`, JSON serialization

**Riscos:**

- Invalidação incorreta pode mostrar dados stale
- Precisa garantir invalidação em todos os endpoints de mutação

---

## M6. Formulário de configuração AI Agent

**Severidade:** MEDIUM (feature incompleta)
**Esforço estimado:** Alto
**Dependência:** Backend routes não existem (só modelo MongoDB)

**Contexto atual:**

- Modelo `AiAgent` existe em `packages/db-chat/src/models/ai-agent.model.ts`
- Schema: `tenantId`, `channelId` (unique), `systemPrompt`, `provider`, `temperature`, `maxTokens`, `maxResponsesPerConversation`, `isActive`
- Campo `aiUserId` existe no Channel model mas não é usado
- Frontend `channel-form-sheet.tsx` não tem tab/campos para AI
- **Rotas backend para CRUD de AI Agent NÃO existem**

**O que implementar:**

### Backend (chat-server)

1. Rotas CRUD em `/chat/channels/:channelId/ai-agent`:
   - `GET` — buscar config do agente para o canal
   - `PUT` — criar/atualizar config (upsert por channelId + tenantId)
   - `DELETE` — desativar agente
2. Use cases: `GetAiAgentConfig`, `UpsertAiAgentConfig`, `DeactivateAiAgent`
3. Validação Zod nos inputs

### Frontend (web)

4. Adicionar tab "AI Agente" no `channel-form-sheet.tsx`:
   - Toggle habilitar/desabilitar AI
   - Seleção de provider (Claude Sonnet, OpenAI)
   - Textarea para system prompt customizável
   - Sliders para temperature e maxTokens
   - Input para maxResponsesPerConversation
5. React Query hooks para fetch/mutate AI agent config
6. Atualizar `UpdateChannelPayload` e `ChannelData` types

---

## M7. Seções "Membros" e "Organização" em Settings

**Severidade:** MEDIUM (feature incompleta)
**Esforço estimado:** Alto
**Dependência:** Backend routes não existem (modelos Prisma existem)

**Contexto atual:**

- Modelos Prisma existem: `Organization`, `Member`, `Invitation`
- Settings page tem sidebar com "Membros" e "Organização" marcados "(em breve)"
- Endpoint `GET /api/v1/tenants` retorna orgs do user mas sem gestão de membros
- Better Auth invitation flow pode já ter suporte parcial

**O que implementar:**

### Membros (prioridade MVP)

#### Backend (server)

1. `GET /api/v1/members` — listar membros da organização
2. `POST /api/v1/invitations` — convidar por email (criar Invitation + enviar email)
3. `PUT /api/v1/members/:id/role` — alterar role (OWNER, ADMIN, MANAGER, COMMERCIAL, VIEWER)
4. `DELETE /api/v1/members/:id` — remover membro
5. `DELETE /api/v1/invitations/:id` — revogar convite pendente
6. RBAC: apenas OWNER e ADMIN podem gerenciar membros

#### Frontend (web)

7. Página `/settings/membros`:
   - Tabela de membros (nome, email, role, status)
   - Botão "Convidar membro" → dialog com email + role
   - Dropdown para alterar role
   - Botão remover com confirmação
   - Lista de convites pendentes com opção de revogar
8. 4 estados UI: Empty, Loading, Error, Success

### Organização (pós-MVP)

#### Backend

9. `GET /api/v1/organizations/:id` — detalhes da org
10. `PUT /api/v1/organizations/:id` — atualizar nome, slug, logo
11. RBAC: apenas OWNER pode editar organização

#### Frontend

12. Página `/settings/organizacao`:
    - Form com nome, slug, logo upload
    - Preview de alterações
