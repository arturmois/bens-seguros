# Audit Remediation — P0 + P1 + P2 Sweep

**Data:** 2026-03-29
**Origem:** `docs/AUDITORIA-PRE-PRODUCAO.md` (62 findings, 29/03/2026)
**Escopo:** 40 findings (P0: 4, P1: 9, P2: 27) — P3 ficam para pos-lancamento
**Objetivo:** Mudar veredito de GO CONDICIONAL para GO com monitoramento

---

## Estrutura

3 fases sequenciais com quality gate entre cada (`pnpm lint && typecheck && build && test`).

| Fase | Severidade  | Fixes | Branch                  | Entrega             |
| ---- | ----------- | ----- | ----------------------- | ------------------- |
| 1    | P0 Blockers | 4     | `fix/audit-p0-blockers` | PR + merge imediato |
| 2    | P1 Critical | 9     | `fix/audit-p1-critical` | PR                  |
| 3    | P2 Major    | 27    | `fix/audit-p2-major`    | 1-2 PRs             |

**Estrategia de testing:** Cada fix de seguranca ganha pelo menos 1 teste que prova a vulnerabilidade antes e a protecao depois. Fixes mecanicos (diacriticos, Helmet, Zod refine) cobertos por typecheck/lint.

---

## Fase 1 — P0 Blockers (4 fixes)

### P0-1: Path Traversal no /uploads/\*

**Arquivo:** `apps/server/src/app.ts:129`
**Fix:** Adicionar `resolve()` + `startsWith()` guard:

```typescript
const resolved = resolve(uploadsDir, request.params['*'])
if (!resolved.startsWith(resolve(uploadsDir))) {
  return reply
    .status(403)
    .send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Invalid path' },
    })
}
```

**Teste:** Request com `../../etc/passwd` retorna 403.

### P0-2: Occurrence sem tenant isolation

**Arquivos:** `claim-routes.ts:201-229`, `packages/core/src/modules/occurrence/`
**Abordagem:** A + B combinados:

1. Migration: `ALTER TABLE "Occurrence" ADD COLUMN "organizationId" TEXT NOT NULL` — popular via JOIN com Claim
2. RLS policy `tenant_isolation` na tabela Occurrence
3. Use cases `CreateOccurrence` e `ListOccurrences` recebem `organizationId`
4. `CreateOccurrence` valida ownership do claim (fail fast) antes de criar occurrence
5. Repositorio usa `tenantPrisma` (nao prisma global)

**Teste:** Tenant A tenta criar occurrence em claim de Tenant B — recebe NotFoundError.

### P0-3: ENCRYPTION_KEY default all-zeros

**Arquivo:** `packages/env/src/index.ts:41`
**Fix:**

1. Remover `.default('0'.repeat(64))` — tornar `ENCRYPTION_KEY` obrigatorio
2. Adicionar chave de teste explicita no `.env.example`
3. Validacao no startup falha loud se nao estiver setada

**Teste:** App nao inicia sem ENCRYPTION_KEY (env validation error).

### P0-4: Tabelas sem RLS

**Arquivo:** Nova Prisma migration
**Tabelas:** Member, Invitation, Insurer, AuditLogArchive

```sql
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Member"
  USING ("organizationId" = current_setting('app.current_tenant', true)
         OR current_setting('app.current_tenant', true) IS NULL);
ALTER TABLE "Member" FORCE ROW LEVEL SECURITY;
-- Repetir para Invitation, Insurer, AuditLogArchive
```

**Decisao:** Policy inclui `OR current_setting(...) IS NULL` para permitir queries sem tenant context (Better Auth faz queries diretas a Member/Session durante login/session validation — essas rodam sem `set_config('app.current_tenant', ...)`).

**Teste:** Query a Member sem tenant context (login flow) funciona. Query com tenant context errado retorna zero rows.

---

## Fase 2 — P1 Critical (9 fixes)

### Sub-grupo: Security (mecanicos)

**P1-1: Chat-server sem Helmet**

- `apps/chat-server/src/app.ts` — `app.register(helmet)`
- Adicionar `@fastify/helmet` como dependencia

**P1-2: Webhook body logado com PII**

- `apps/chat-server/src/infra/http/routes/webhook-routes.ts:263`
- Substituir `{ body: request.body }` por log minimo sem PII: logar apenas o tipo do objeto (`object` field) usando Zod `.safeParse()` ou optional chaining com type guard

**P1-3: Chat-server sem error handler**

- Copiar/adaptar `setErrorHandler` de `apps/server/src/app.ts:215-243`
- Incluir Sentry capture, formato estruturado, log adequado

**P1-9: Import job status sem tenant check**

- `apps/server/src/routes/v1/client-routes.ts:225-247`
- Apos buscar job, comparar `job.data.organizationId !== request.organizationId` — retorna 404 se diferente

### Sub-grupo: Tenant Enforcement

**P1-4: MongoDB tenant enforcement via Mongoose plugin**

Criar plugin global que injeta `tenantId` como filtro em operacoes de query:

- Hooks: `pre('find')`, `pre('findOne')`, `pre('updateOne')`, `pre('updateMany')`, `pre('deleteOne')`, `pre('deleteMany')`
- Tenant context via `AsyncLocalStorage` — chat-server popula no inicio de cada request/socket event
- Sem contexto ativo = plugin nao injeta (permite migrations, scripts, jobs administrativos)
- Defesa em profundidade — repositorios continuam filtrando manualmente

**Arquivo novo:** `packages/db-chat/src/plugins/tenant-scope-plugin.ts`
**Registro:** `packages/db-chat/src/connection.ts` — `mongoose.plugin(tenantScopePlugin)`

### Sub-grupo: Business Logic

**P1-5: Validacao startDate < endDate**

- `apps/server/src/schemas/policy.schemas.ts`
- Adicionar `.refine(d => d.endDate > d.startDate, { message: 'Data de fim deve ser posterior a data de inicio', path: ['endDate'] })`

**P1-6: Expiracao automatica de apolices**

- **Worker:** `apps/worker` — novo processor `expire-policies`
- **Job:** BullMQ repeatable, `{ repeat: { pattern: '0 2 * * *' } }` (2am daily)
- **Logica:** `prisma.policy.updateMany({ where: { status: 'ACTIVE', endDate: { lt: new Date() } }, data: { status: 'EXPIRED' } })`
- **Client Prisma:** global (sem RLS context) — job administrativo cross-tenant
- **Log:** Structured log com count de policies expiradas
- **Nao envia notificacao nesta etapa** — notificacao de renovacao e feature futura

### Sub-grupo: UX

**P1-7: Kanban drag-and-drop**

- **Dependencia:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **Comportamento:**
  - Drag card entre colunas = `advanceProposalStage` API call
  - So permite transicoes validas — colunas invalidas mostram visual "drop not allowed"
  - Optimistic update — move card imediatamente, reverte com toast se API falhar
  - Sem reordenacao dentro da mesma coluna (sem conceito de prioridade no dominio)
  - LOST column nao aceita drop (requer modal com `lostReason`)
- **Arquivos:** `proposal-kanban.tsx`, `kanban-column.tsx`, novo `kanban-card-draggable.tsx`

### Sub-grupo: Testing

**P1-8: Testes de middleware de seguranca**

- **Approach:** Integration tests com `app.inject()` do Fastify (sem HTTP real, sem test container)
- **Arquivo:** `apps/server/src/middlewares/__tests__/security-middleware.spec.ts`
- **Testes (Top 4 da auditoria):**
  1. Tenant isolation — user de org-1 com header org-2 → 403
  2. RBAC enforcement — COMMERCIAL tentando DELETE /clients/:id → 403
  3. Internal auth HMAC — request sem header → 401
  4. Cross-tenant proposal advance — proposal de org-1 via org-2 → NotFound

---

## Fase 3 — P2 Major (27 fixes)

### Bloco A: Security & Tenant (7 fixes)

**P2-1: Chat-server CORS**

- Ler origins de env var `CORS_ORIGINS` (comma-separated)
- Dev: `localhost:*` | Prod: `app.bensseg.com` + origens widget por tenant
- Consistente com pattern do server

**P2-2: Widget rate limiters para Redis**

- Migrar de in-memory para Redis-backed
- Mesmo store do `@fastify/rate-limit` do server

**P2-3: Pino redact paths expandidos**

- Adicionar nested paths: `["body.cpf", "body.cnpj", "body.email", "body.phone", "body.document", "body.rg"]`
- Aplicar em server + chat-server

**P2-4: CSRF middleware**

- **Decisao: NAO implementar middleware separado**
- Better Auth ja usa `sameSite: lax` + valida `Origin` header
- SPA com API JSON nao tem form submission cross-origin
- Adicionar comentario documentando a protecao existente

**P2-11: Member/Invitation update sem orgId**

- `member-routes.ts:166` — adicionar `organizationId` no WHERE clause de update/delete operations

**P2-12: QR code cross-tenant**

- `socket-handler.ts:284` — verificar `tenantId` antes de emitir `CHANNEL_STATUS_GET` response

**P2-13: Channel query sem tenantId**

- `conversation-routes.ts:65` — adicionar `tenantId` no filtro MongoDB da listagem

### Bloco B: Data Integrity (5 fixes)

**P2-5: Commission reversal atomica**

- `packages/core/src/modules/commission/application/reverse-commission.ts`
- Wrappear em `prisma.$transaction([...])` — interactive transaction
- Marca original REVERSED + cria commission negativa atomicamente

**P2-6: LOST proposals nao editaveis**

- `packages/core/src/modules/proposal/application/update-proposal-details.ts`
- Guard: `if (proposal.stage === 'LOST') throw new InvalidStageTransitionError(...)`

**P2-7: Duplicate policy P2002**

- `packages/core/src/modules/policy/application/issue-policy.ts`
- Catch Prisma `P2002` → lancar `DuplicatePolicyError` com mensagem pt-BR

**P2-10: Claim sequence race condition**

- Verificar se Redis INCR do fix L2 anterior esta sendo usado
- Se nao, aplicar mesmo padrao: `INCR claim:sequence:{orgId}`

**P2-27: tenant-client.ts query fora do tx**

- Mover `query(args)` para dentro do `$transaction` callback

### Bloco C: Performance (5 fixes)

**P2-14: Dashboard cache Redis**

- Usar `CacheService` existente em `packages/core`
- Cache key: `dashboard:stats:{orgId}:{preset}` com TTL 60s
- Miss = executa 19 queries, seta no Redis, retorna
- Sem invalidacao explicita — 60s stale aceitavel para dashboard

**P2-15: Remover count() paralelo em paginacao**

- Todos os repositories com `findMany` cursor-based
- Verificar primeiro se o frontend usa `totalCount` em algum lugar (ex: "X de Y resultados"). Se usar, manter count apenas onde necessario
- Se frontend ja usa `hasNextPage` baseado em N+1 items sem exibir total, remover a query `count()` desnecessaria

**P2-16: CSV export streaming**

- Substituir carregamento de 10K rows em memoria
- Cursor-based pagination no Prisma (batches de 500 rows)
- Pipe para `reply.raw` como stream
- `papaparse.unparse()` por batch

**P2-17: Trigram index para ILIKE search**

- Migration SQL:
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX idx_client_name_trgm ON "Client" USING gin (name gin_trgm_ops);
  CREATE INDEX idx_proposal_client_name_trgm ON "Proposal" USING gin ("clientName" gin_trgm_ops);
  ```

**P2-18: Chat messages virtualizacao**

- `@tanstack/react-virtual` — mesmo ecossistema do React Query
- Virtualiza lista de mensagens
- Manter scroll-to-bottom behavior + infinite scroll para mensagens antigas

### Bloco D: Code Quality & Refactoring (5 fixes)

**P2-22: Business logic em member-routes**

- Extrair para use cases DDD Light em `packages/core`:
  - `InviteMember`, `UpdateMemberRole`, `RemoveMember`
- Routes passam a ser thin handlers (resolve use case, translate errors)

**P2-23: channel-routes.ts split**

- Split em 3 arquivos:
  - `channel-routes.ts` — CRUD de channels (~150 linhas)
  - `channel-webhook-routes.ts` — webhook handlers Meta (~200 linhas)
  - `channel-meta-service.ts` — Meta Graph API calls (~200 linhas)

**P2-24: Meta API responses com Zod**

- Criar schemas Zod para os 12 pontos de cast no novo `channel-meta-service.ts`
- Page token response, webhook subscription response, send message response, etc.

**P2-25: Mongoose double-cast pattern**

- Criar tipo generico `MongooseDoc<T>` em `packages/db-chat/src/types.ts`
- Substituir os 20+ `as unknown as X` nos mongoose repositories

**P2-26: E2E tests expandidos**

- Expandir 5 E2E existentes de smoke para fluxos reais:
  - Login → criar proposta → avancar stage → emitir apolice
  - Login → criar cliente → ver detalhe → editar
- 2-3 happy paths completos (nao cobrir tudo)

### Bloco E: UX & i18n (5 fixes)

**P2-8: Kanban paginacao por coluna**

- Fetch por stage (uma query por coluna, nao global)
- `take: 20` + botao "carregar mais" no footer da coluna
- Combina com DnD do P1-7

**P2-9: Insurer em propostas/apolices**

- Migration: `ALTER TABLE "Proposal" ADD COLUMN "insurerId" TEXT REFERENCES "Insurer"(id)`
- Adicionar `insurerId` optional ao `createProposalBodySchema` e `updateProposalDetailsBodySchema`
- `IssuePolicy` propaga `insurerId` da proposta para a policy
- Frontend: select de seguradora no form de proposta (usa cache Redis de insurers)

**P2-19: Responsive tables**

- Esconder colunas de menor prioridade em < 768px via CSS
- Manter: nome + status + acoes
- Esconder: data de criacao, seguradora, valores secundarios
- Aplicar em: `proposals-table.tsx`, `clients-table-rows.tsx`, `policies-table.tsx`

**P2-20: Diacriticos pt-BR**

- Sweep em todos os 14 arquivos listados na auditoria
- Corrigir 20+ strings sem acentos/cedilha. Exemplos:
  - `nao` → `não`, `comissao` → `comissão`, `organizacao` → `organização`
  - `obrigatorio` → `obrigatório`, `informacoes` → `informações`
  - `descricao` → `descrição`, `maximo` → `máximo`, `invalido` → `inválido`
- Arquivos: `commission-routes.ts`, `claim-routes.ts`, `stats-routes.ts`, `client-routes.ts`, `policy-routes.ts`, `organization-routes.ts`, `csv-import-processor.ts`, `use-clients.ts`, `use-import-clients.ts`, `policy-export-button.tsx`, `client-export-button.tsx`, `proposal-export-button.tsx`, `use-ai-agents.ts`, `use-documents.ts`

**P2-21: Chat MessagesError com retry**

- Adicionar botao "Tentar novamente" no componente `MessagesError`
- On click: `refetch()` do React Query
- Consistente com outros error states da aplicacao

---

## Dependencias entre fixes

```
P0-2 (Occurrence orgId) ──▸ P0-4 (RLS) — mesma migration pode incluir ambos
P1-7 (Kanban DnD) ──▸ P2-8 (Kanban pagination) — DnD primeiro, pagination depois
P2-22 (member-routes extract) ──▸ P2-11 (member orgId WHERE) — extrair primeiro, depois corrigir no use case
P2-23 (channel-routes split) ──▸ P2-24 (Meta API Zod) — split primeiro, Zod no service novo
```

## Fora de escopo

- P3 findings (21 items) — pos-lancamento
- Features novas (F06-F10 do roadmap)
- Notificacoes de renovacao de apolice (alem do status EXPIRED)
- Mongoose migration para strict tenant middleware (plugin e defesa em profundidade, nao substitui filtro explicito)
