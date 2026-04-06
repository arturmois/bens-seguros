# Code Review P1 + P2 Fixes — Design Spec

**Data:** 2026-04-06
**Origem:** `CODE-REVIEW-REPORT.md` (auditoria pre-lancamento)
**Escopo:** 7 fixes confirmados e verificados contra o codebase

---

## Contexto

O code review report identificou issues P1 (criticos) e P2 (importantes). Todos os 7 itens abaixo foram verificados contra o codebase real. O projeto esta em fase de desenvolvimento (sem usuarios reais), o que simplifica decisoes de risco.

---

## Fix 1: Sentry nos Workers (P1-1)

**Problema:** `apps/worker` e `apps/chat-worker` nao tem `Sentry.init`. Erros em background jobs (PDFs, emails, CSV imports, IA, WhatsApp) sao silenciosos.

**Solucao:** Adicionar `Sentry.init` em ambos os workers, copiando o padrao exato de `apps/server/src/server.ts:1-15`:

- Guard `if (env.SENTRY_DSN)`
- `tracesSampleRate: 0.2`
- `beforeSend: stripPiiFromEvent` de `@repo/shared/sentry-pii`
- Posicionar **antes** de qualquer outro codigo (BullMQ, Redis)
- Adicionar `Sentry.captureException` no catch de erros fatais

**Arquivos:** `apps/worker/src/index.ts`, `apps/chat-worker/src/index.ts`

**Sem mudancas em `@repo/env`** — `SENTRY_DSN` ja e opcional.

---

## Fix 2: Graceful Shutdown no Server (P1-2)

**Problema:** `apps/server/src/server.ts` nao tem handlers de `SIGTERM`/`SIGINT`. Requests em andamento sao cortados durante deploy.

**Solucao:** Adicionar shutdown handler apos `app.listen()`:

- `process.on('SIGTERM')` e `process.on('SIGINT')` chamam `app.close()` (Fastify drena conexoes)
- Antes de sair, chamar `Sentry.close(2000)` para flush de eventos pendentes
- Padrao de referencia: `apps/chat-server/src/index.ts:83-96`

**Arquivo:** `apps/server/src/server.ts`

---

## Fix 3: Migration Order no Deploy Script (P1-4)

**Problema:** `scripts/deploy.sh:94-101` roda migrations APOS container healthy. Se o codigo novo depende de colunas novas, ha uma janela de erro.

**Solucao:** Mover migration para ANTES do `docker compose up`:

- Ordem atual: pull → deploy container → health check → migrate
- Ordem nova: pull → **migrate no container antigo** → deploy container → health check
- `docker compose exec -T server npx prisma migrate deploy` roda no container que ainda esta de pe
- Se migration falhar, deploy aborta antes de trocar containers

**Arquivo:** `scripts/deploy.sh`

---

## Fix 4: HSTS no Helmet (P1-5)

**Problema:** Helmet em `apps/server/src/app.ts:75-87` nao configura HSTS. Chat-server (`apps/chat-server/src/app.ts:108`) tem Helmet sem config nenhuma.

**Solucao:** Adicionar config HSTS em ambos:

- `maxAge: 31536000` (1 ano)
- `includeSubDomains: true`
- `preload: true`

**Arquivos:** `apps/server/src/app.ts`, `apps/chat-server/src/app.ts`

---

## Fix 5: Health Endpoints Robustos (P2-5)

**Problema:** Health endpoint do server retorna `{ status: 'ok' }` sem verificar dependencias. Docker health check nao detecta DB down.

**Solucao:**

**`apps/server` (PostgreSQL + Redis):**

- `prisma.$queryRaw\`SELECT 1\`` para verificar PostgreSQL
- `redis.ping()` para verificar Redis
- Se qualquer um falhar: HTTP 503 + `{ status: 'degraded', error: '<descricao>' }`
- Se ambos OK: HTTP 200 + `{ status: 'ok' }`

**`apps/chat-server` (MongoDB + Redis):**

- Verificar se tem health endpoint. Se sim, adicionar:
  - `mongoose.connection.readyState === 1` para MongoDB
  - `redis.ping()` para Redis
  - Mesmo padrao de resposta 200/503

**Sem timeout explicito** — Fastify e Docker health check ja tem seus proprios.

**Arquivos:** `apps/server/src/app.ts`, `apps/chat-server/src/app.ts` (se tiver health)

---

## Fix 6: Filter JS para WHERE Prisma (P2-8)

**Problema:** `apps/server/src/routes/v1/claims/create-claim.ts:34-43` busca todos os managers e filtra em JS com `.filter((m) => m.userId !== request.user!.id)`.

**Solucao:** Mover filtro para WHERE do Prisma:

```typescript
// Adicionar ao where existente:
userId: {
  not: request.user!.id
}
```

Elimina o `.filter()` — banco faz o trabalho, menos dados transferidos.

**Arquivo:** `apps/server/src/routes/v1/claims/create-claim.ts`

---

## Fix 7: Correcao de Acentos pt-BR (P2-9)

**Problema:** 6 instancias de strings pt-BR sem diacriticos em 3 arquivos.

**Correcoes:**

| Arquivo                                                 | Linha | De                    | Para                  |
| ------------------------------------------------------- | ----- | --------------------- | --------------------- |
| `apps/server/src/routes/v1/organization/_schemas.ts`    | 9     | `maximo`              | `máximo`              |
| `apps/server/src/routes/v1/organization/_schemas.ts`    | 13    | `maximo`              | `máximo`              |
| `apps/server/src/routes/v1/organization/_schemas.ts`    | 16    | `minusculas, numeros` | `minúsculas, números` |
| `apps/server/src/routes/v1/organization/upload-logo.ts` | 66    | `invalido`            | `inválido`            |
| `apps/server/src/routes/v1/organization/upload-logo.ts` | 78    | `maximo`              | `máximo`              |
| `apps/chat-worker/src/tools/update-client-data.ts`      | 14    | `informacoes`         | `informações`         |

**Excluidos:** `settings-layout.tsx` e `settings/page.tsx` — usam `organizacao` como identifier de codigo (tipo TS, case match, query param), nao como UI string. Acentos em identifiers causariam problemas de encoding em URLs.

---

## Fora de Escopo

- Testes para os fixes (triviais, fase de dev)
- Abstracoes/helpers compartilhados (YAGNI — 2-4 apps cada)
- Itens P2-1, P2-2, P2-3, P2-4 (testes, coverage — backlog separado)
- Itens P3 (backlog)
- Refactoring de `accept-invitation.ts` (P2-6 — escopo separado)
- ProposalChecklistItem sem organizationId (P2-7 — requer migration)
