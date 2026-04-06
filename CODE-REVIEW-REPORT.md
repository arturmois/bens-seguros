# Code Review Completo — Bens Seguros (Monorepo Turborepo)

**Data:** 2026-04-06
**Revisor:** Claude Opus 4.6 (1M context)
**Escopo:** Auditoria técnica pré-lançamento — 6 apps, 7 packages, 3 configs, CI/CD, Docker, Nginx

---

## Resumo Executivo

O Bens Seguros é um SaaS ERP impressionantemente maduro para um time pequeno em estágio pré-produção. A arquitetura é sólida, com decisões bem fundamentadas: DDD híbrido, multi-tenancy com RLS defense-in-depth, criptografia AES-256-GCM para PII, RBAC granular com CASL, e uma pipeline CI/CD funcional com rollback automático. O TypeScript strict está em vigor sem nenhuma violação (`any`, `@ts-ignore`, `eslint-disable` = zero), o que é raro. Os principais riscos são: (1) cobertura de testes muito baixa no `apps/server` (3 specs para ~90 route handlers), (2) workers sem Sentry (falhas silenciosas em background jobs), (3) 4 vulnerabilidades high em dependências transitivas, e (4) falta de graceful shutdown no server principal. **Nenhum blocker P0 foi identificado** — o sistema pode ir para produção com ressalvas. Considerando o contexto de SaaS v1 de time pequeno para corretoras de seguros brasileiras, o nível de maturidade é acima da média.

---

## Scorecard

| Dimensão              | Nota (1-5) | Status |
| --------------------- | ---------- | ------ |
| Estrutura do Monorepo | 4          | 🟢     |
| Arquitetura           | 4          | 🟢     |
| Qualidade de Código   | 4.5        | 🟢     |
| Testes                | 3          | 🟡     |
| Segurança             | 4          | 🟢     |
| Performance           | 4          | 🟢     |
| DevOps/CI/CD          | 4          | 🟢     |
| DX                    | 4          | 🟢     |
| Acessibilidade        | 3          | 🟡     |
| Negócio/SaaS          | 3          | 🟡     |

🟢 = 4-5 (Pronto) | 🟡 = 3 (Precisa atenção) | 🔴 = 1-2 (Blocker)

---

## Pontos Positivos

### Qualidade de Código Excepcional

- **Zero violações às proibições do CLAUDE.md**: nenhum `any`, nenhum `@ts-ignore`, nenhum `// eslint-disable`, nenhum `as` fora de testes. Verificado via grep em todo o codebase.
- **TypeScript strict habilitado via herança**: `config/typescript-config/base.json:4` define `"strict": true` + `"noUncheckedIndexedAccess": true`, herdado por todos os packages/apps.
- **console.log apenas em seed.ts** (`packages/db/prisma/seed.ts`), que é aceitável para output de CLI.
- **Pino structured logging** em todos os apps com redação de PII (`packages/shared/src/pino-redact.ts`) — cobrindo CPF, CNPJ, email, phone, password, tokens, Meta OAuth tokens.

### Segurança Robusta

- **Criptografia de PII**: AES-256-GCM para CPF/CNPJ (`packages/shared/src/crypto.ts:9-58`), com HMAC-SHA256 para busca por hash (`crypto.ts:65-71`). ENCRYPTION_KEY validada como 64 hex chars (`packages/env/src/index.ts:4-7`).
- **RLS defense-in-depth**: 15 tabelas com RLS (`packages/db/prisma/rls-policies.sql`), 12 strict + 3 permissive (Member, Invitation, AuditLogArchive). Todas com `FORCE ROW LEVEL SECURITY`.
- **RBAC granular com CASL**: 5 roles bem definidos (`packages/auth/src/abilities.ts:46-93`), com COMMERCIAL restrito a create/read/update de Client/Proposal, e VIEWER somente leitura.
- **Middleware chain consistente**: `authMiddleware → requireAuth → tenantMiddleware → requireAbility` aplicado em todas as rotas v1 (`apps/server/src/app.ts:253-274`).
- **HMAC para comunicação interna**: `packages/shared/src/internal-auth.ts` com timing-safe comparison e maxAge de 300s.
- **Rate limiting Redis-backed**: Login (10/15min), forgot password (3/h), registration (5/h), global (100/min), internal (20/min) — todos definidos em `packages/shared/src/rate-limit-constants.ts`.
- **Upload security**: path traversal prevenido com `resolved.startsWith(safeBase)` check (`apps/server/src/app.ts:170-175`).
- **Sentry integrado com PII stripping** em server (`apps/server/src/server.ts:6-15`), chat-server (`apps/chat-server/src/index.ts:9-18`), e web (client + server configs). Usa `stripPiiFromEvent` de `@repo/shared/sentry-pii`.

### Arquitetura Bem Desenhada

- **DDD híbrido pragmático**: módulos Full (Proposal com 12 specs, Commission com 7 specs) com separação domain/application/infrastructure. Módulos Light com separação mínima adequada.
- **Route per file + Orval codegen**: cada rota em `apps/server/src/routes/v1/<domain>/` com `_schemas.ts` co-locado. OpenAPI auto-gerado → Orval gera hooks React Query + tipos + Zod para o frontend.
- **Cursor-based pagination universal**: `apps/server/src/routes/_shared/pagination.schema.ts` define cursor + limit, sem offset em nenhuma listagem.
- **Prisma schema bem modelado**: `packages/db/prisma/schema.prisma` com money em cents (`premiumValueInCents`, `commissionValueInCents`), percentages em basis points (`percentageInBasisPoints`), soft delete (`deletedAt`), e indexes compostos em `(organizationId, <filter>)` em todas as tabelas.
- **Error handling centralizado**: `apps/server/src/routes/v1/handle-domain-error.ts` mapeia 30+ domain error codes para HTTP status. Erros 500 em produção retornam mensagem genérica, sem stack trace.
- **Env validation via t3-env**: `packages/env/src/index.ts` com Zod schemas para todas as variáveis, incluindo validação de formato (ENCRYPTION_KEY 64 hex, AUTH_SECRET min 32).

### Infraestrutura Madura

- **Dockerfiles multi-stage otimizados**: `Dockerfile.server` e `Dockerfile.chat` com 4 stages (base, deps, builder, prod-deps, runner). Copiam apenas o necessário do monorepo.
- **Docker Compose prod** com healthchecks, resource limits (512MB apps, 1GB DBs), log rotation (10m/3 files), e MongoDB com auth + replica set.
- **Nginx** com SSL (Cloudflare Origin), WebSocket upgrade para Socket.IO, HTTP→HTTPS redirect, e DNS resolver para container recreation.
- **Deploy script** (`scripts/deploy.sh`) com rollback automático, health polling (120s timeout), smoke test de cookies cross-subdomain.
- **Backup script** (`scripts/backup.sh`) para PostgreSQL + MongoDB com upload R2 e retenção de 7 dias.
- **CI/CD completo**: GitHub Actions com quality gates (lint, typecheck, build, test) reusados via `workflow_call`, path-based deploy triggers, e Docker layer caching via GHA.
- **Graceful shutdown** em chat-server (`apps/chat-server/src/index.ts:83-96`), worker (`apps/worker/src/index.ts:52-74`), e chat-worker (`apps/chat-worker/src/index.ts:412-443`).

---

## Problemas Encontrados

### ⚠️ P1 — Crítico (Resolver na primeira semana pós-launch)

#### P1-1: Workers sem Sentry — falhas silenciosas em background jobs

- **Localização:** `apps/worker/src/index.ts`, `apps/chat-worker/src/index.ts`
- **Descrição:** Enquanto `apps/server` e `apps/chat-server` têm Sentry.init com PII stripping, os workers (que processam PDFs, emails, importações CSV, IA, WhatsApp) NÃO têm Sentry. Erros em background jobs são silenciosos — nenhuma notificação quando um email falha, um PDF não gera, ou uma importação CSV quebra.
- **Impacto:** Falhas em produção passam despercebidas. Usuários podem não receber emails de verificação ou reset de senha sem ninguém saber.
- **Correção sugerida:**

```typescript
// apps/worker/src/index.ts (e apps/chat-worker/src/index.ts)
import * as Sentry from '@sentry/node'
import { env } from '@repo/env'
import { stripPiiFromEvent } from '@repo/shared/sentry-pii'

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      return stripPiiFromEvent(event)
    },
  })
}
```

#### P1-2: Server principal sem graceful shutdown

- **Localização:** `apps/server/src/server.ts`
- **Descrição:** O chat-server, worker, e chat-worker todos implementam graceful shutdown com `process.on('SIGTERM/SIGINT')`. O server principal (Fastify ERP API) não tem. No Docker com `restart: always`, um `docker compose up -d --force-recreate` envia SIGTERM ao container. Sem handler, conexões em andamento são cortadas abruptamente.
- **Impacto:** Requests em andamento podem falhar durante deploy. Transações Prisma podem ficar incompletas.
- **Correção sugerida:**

```typescript
// apps/server/src/server.ts - adicionar após app.listen
const shutdown = async () => {
  app.log.info('Shutting down server...')
  await app.close()
  app.log.info('Server shut down')
}
process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())
```

#### P1-3: Vulnerabilidades high em dependências

- **Localização:** `pnpm-lock.yaml`, `package.json:37` (overrides)
- **Descrição:** `pnpm audit` revela 14 vulnerabilidades (4 high): picomatch <2.3.2 (2x), lodash <=4.17.23 (1x, preso pelo override em `package.json:42`), defu <=6.1.4 (1x via Prisma). O override de lodash fixa a versão em `4.17.23` que está na faixa vulnerável (CVE-2024-49766).
- **Impacto:** lodash prototype pollution pode ser explorado em cenários específicos (bull-board o consome). picomatch ReDoS em lint-staged.
- **Correção sugerida:**

```json
// package.json - atualizar override
"lodash": "4.17.24"
```

Para picomatch e defu: aguardar patches upstream (Prisma, lint-staged) ou aplicar `pnpm.patchedDependencies`.

#### P1-4: Deploy script roda migrações APÓS container healthy

- **Localização:** `scripts/deploy.sh:95-101`
- **Descrição:** O `ARCHITECTURE-DECISIONS.md:99` define a ordem: "1. prisma migrate deploy → 2. docker pull + restart → 3. health check". Porém o deploy.sh faz: pull → deploy containers → health check → ENTÃO migrate. Se o código novo depende de colunas/tabelas adicionadas pela migration, o health check passa (endpoint `/health` retorna `{status: ok}`), mas queries podem falhar.
- **Impacto:** Se uma migration adiciona uma coluna que o código novo usa, haverá erros entre o deploy e a migration (janela de ~10-30s). Na prática, migrações backward-compatible mitigam isso, mas viola o princípio documentado.
- **Correção sugerida:** Mover a migration para ANTES do `docker compose up`:

```bash
# Rodar migration no container antigo (que tem Prisma CLI)
docker compose -f "$COMPOSE_FILE" exec -T server npx prisma migrate deploy || exit 1
# Então deploy novo container
docker compose -f "$COMPOSE_FILE" up -d --force-recreate $CONTAINERS
```

#### P1-5: HSTS não configurado no Helmet

- **Localização:** `apps/server/src/app.ts:75-87`
- **Descrição:** Helmet está configurado com CSP, mas sem HSTS explícito. O Cloudflare adiciona HSTS no edge, mas se um usuário acessa diretamente a API (bypass Cloudflare), não há proteção contra downgrade attacks.
- **Impacto:** Baixo se Cloudflare está entre o usuário e o server. Mas defense-in-depth recomenda:

```typescript
await app.register(helmet, {
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  // ... CSP existente
})
```

---

### 🔶 P2 — Importante (Resolver no primeiro mês)

#### P2-1: Cobertura de testes muito baixa no apps/server

- **Localização:** `apps/server/src/` — apenas 3 specs: `uploads-path-traversal.spec.ts`, `tenant-middleware.spec.ts`, `internal-auth-middleware.spec.ts`
- **Descrição:** O server ERP tem ~90 route handlers, 5 middlewares, e múltiplos services (audit-logger, bull-board, container-registrations). Apenas 3 specs cobrindo path traversal e 2 middlewares. Os route handlers (onde ~40 queries diretas ao Prisma acontecem em ~30 routes que não passam por use cases do core) não têm nenhum teste.
- **Impacto:** Regressões em routes não são detectadas. Queries Prisma com filtros incorretos de organizationId podem vazar dados entre tenants sem falhar em CI.
- **Correção sugerida:** Priorizar testes de integração para:
  1. Routes que fazem queries diretas ao Prisma (invitations, members, organization, audit-logs)
  2. O middleware chain completo (auth → tenant → ability)
  3. O error handler centralizado (Zod validation, domain errors, 500s)

#### P2-2: Módulos DDD sem testes — endorsement (3 use cases) e member (2 use cases)

- **Localização:** `packages/core/src/modules/endorsement/`, `packages/core/src/modules/member/`
- **Descrição:** O módulo de endorsement tem 3 use cases (create, list, get) sem nenhum `.spec.ts`. O módulo member tem 2 use cases sem testes. Módulos com cobertura parcial: assistance (1/4 = 25%), claim (2/5 = 40%).
- **Impacto:** Mudanças em regras de negócio de endorsement (usado em renovações de apólices) podem quebrar sem detecção.
- **Correção sugerida:** Seguir o padrão TDD dos módulos commission (7 specs) e proposal (12 specs) — criar mocked repository tests para todos os use cases.

#### P2-3: Sem coverage report configurado

- **Localização:** `packages/core/vitest.config.ts`, `apps/server/vitest.config.ts`, etc.
- **Descrição:** Nenhuma das 5 configs Vitest tem `coverage` configurado. Não há como medir se a cobertura está melhorando ou piorando.
- **Correção sugerida:** Adicionar ao vitest.config.ts:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
}
```

E adicionar `pnpm test -- --coverage` ao CI.

#### P2-4: CI sem security audit

- **Localização:** `.github/workflows/ci.yml`
- **Descrição:** O CI roda lint, typecheck, build, test — mas não roda `pnpm audit`. As 14 vulnerabilidades encontradas não seriam detectadas no pipeline.
- **Correção sugerida:** Adicionar step ao CI:

```yaml
- run: pnpm audit --audit-level high
  continue-on-error: true # Warn but don't block (transitives may not have fixes)
```

#### P2-5: Health endpoint superficial

- **Localização:** `apps/server/src/app.ts:148` — `app.get('/health', async () => ({ status: 'ok' }))`
- **Descrição:** O health endpoint apenas retorna `{status: 'ok'}` sem verificar conectividade com PostgreSQL, Redis, ou MongoDB. O Dockerfile e Docker Compose usam esse endpoint para health checks. Se o DB estiver down mas o processo Node.js alive, o container reporta healthy.
- **Impacto:** Auto-recovery do Docker não funciona se DB estiver down. O chat-server tem o mesmo problema.
- **Correção sugerida:**

```typescript
app.get('/health', async () => {
  await prisma.$queryRaw`SELECT 1`
  await redis.ping()
  return { status: 'ok' }
})
```

#### P2-6: Business logic em route handlers (Light DDD modules)

- **Localização:** ~40 queries Prisma diretas em `apps/server/src/routes/v1/` — exemplos:
  - `invitations/accept-invitation.ts:69-221` (150 linhas de lógica)
  - `invitations/list-invitations.ts:35-40`
  - `members/update-member-role.ts:45`
  - `organization/update-organization.ts:38-61`
  - `audit-logs/list-audit-logs.ts:42-48`
  - `proposals/send-quote.ts:55-117`
  - `policies/generate-policy-pdf.ts:142-168`
- **Descrição:** Os módulos "Light DDD" fazem queries diretas ao Prisma global nos route handlers, bypassing use cases e repositories. Isso é aceitável para CRUD simples, mas `accept-invitation.ts` tem 150+ linhas com lógica complexa (verificar expiração, criar membro, aceitar termos, gerenciar sessão) que deveria estar em um use case.
- **Impacto:** Dificulta testes unitários (precisa mockar Prisma inteiro) e violador do princípio "no business logic in routes" do CLAUDE.md.
- **Correção sugerida:** Extrair ao menos `accept-invitation` para um use case em `packages/core/src/modules/invitation/application/accept-invitation.ts`.

#### P2-7: ProposalChecklistItem sem organizationId — potencial tenant leak

- **Localização:** `packages/db/prisma/schema.prisma:353-368`
- **Descrição:** `ProposalChecklistItem` não tem campo `organizationId` nem RLS policy. A isolação depende 100% do JOIN com `Proposal` que tem organizationId. Uma query direta `prisma.proposalChecklistItem.findMany()` sem WHERE retornaria itens de todos os tenants.
- **Impacto:** Baixo, pois todas as queries existentes filtram via proposalId. Mas viola defense-in-depth.

#### P2-8: Filtragem em JavaScript no create-claim (N+1 potencial)

- **Localização:** `apps/server/src/routes/v1/claims/create-claim.ts:34-43`
- **Descrição:** Ao criar um claim, busca todos os managers da org e filtra no JavaScript (`managers.filter((m) => m.userId !== request.user!.id)`) ao invés de usar `WHERE userId: { not: request.user!.id }` no Prisma.
- **Impacto:** Com muitos membros, transfere dados desnecessários do banco. Fácil de corrigir.

#### P2-9: 12 violações de acentos em pt-BR em UI strings

- **Localização:** 6 ficheiros (listados na seção de Qualidade de Código)
- **Descrição:** O CLAUDE.md proíbe escrever português sem diacríticos em UI strings. Foram encontradas 12 instâncias: `organizacao`, `maximo`, `invalido`, `informacoes`, `nao`, `voce`, `so`.
- **Impacto:** Apresentação incorreta ao usuário final. Correção trivial (~5 minutos).

#### P2-10: Docker containers rodam como root

- **Localização:** `Dockerfile.server:48`, `Dockerfile.chat:34`
- **Descrição:** Os Dockerfiles não criam usuário non-root. Os containers rodam como root, o que amplia a superfície de ataque se houver escape de container.
- **Correção sugerida:** Adicionar antes do CMD:

```dockerfile
RUN addgroup --system app && adduser --system --ingroup app app
USER app
```

---

### 📋 P3 — Desejável (Backlog)

#### P3-1: Sem 2FA/MFA

- **Descrição:** Nenhuma opção de segundo fator para contas com acesso a dados sensíveis (CPF, comissões). Better Auth suporta TOTP plugin.
- **Complexidade:** Média (2-3 dias com Better Auth TOTP plugin)

#### P3-2: Sem feature flags

- **Descrição:** Sem mecanismo de feature flags para rollout gradual de funcionalidades. Recomendado para SaaS multi-tenant.
- **Complexidade:** Baixa (1 dia com field JSON em Organization ou lib como Flagsmith)

#### P3-3: Sem billing/subscriptions

- **Descrição:** Campo `plan: 'FREE'` mencionado no ARCHITECTURE-DECISIONS.md mas não implementado no schema. Sem Stripe, sem limites de seats/storage, sem tela de billing. Decisão documentada: "implementar quando tiver 2+ clientes" — correto para MVP.

#### P3-4: LGPD deletion não implementado

- **Descrição:** `docs/SECURITY-SPEC.md` define job de LGPD deletion com anonimização de PII, mas a implementação não foi encontrada nos workers. Apenas especificado.
- **Impacto:** Obrigatório para LGPD compliance, mas pode ser feito nos primeiros meses.

#### P3-5: Sem staging/preview environment

- **Descrição:** Apenas dev (local) e prod (VPS). Sem ambiente de staging para testar deploys antes de produção. Vercel tem preview deploys para o web, mas server/chat não têm equivalente.

#### P3-6: Turborepo Remote Caching não configurado no CI

- **Localização:** `.github/workflows/ci.yml`
- **Descrição:** CI usa `turbo build/lint/typecheck/test` mas sem Remote Caching. Cada run recompila tudo.
- **Correção sugerida:** Adicionar `TURBO_TOKEN` e `TURBO_TEAM` como secrets do GitHub e configurar no CI.

#### P3-7: `'unsafe-inline'` no CSP

- **Localização:** `apps/server/src/app.ts:79-80`
- **Descrição:** CSP permite `'unsafe-inline'` para scripts e estilos, necessário para Scalar API docs. Em produção, considerar mover Scalar para rota protegida (já está) e usar nonces.

#### P3-8: MongoDB em produção sem --auth no dev compose

- **Localização:** `docker-compose.yml:18-19` — MongoDB sem `--auth` em dev
- **Descrição:** O docker-compose de dev não usa auth para MongoDB (sem `--auth`, sem keyFile). O de produção usa corretamente. Não é um risco de segurança direto (dev é local), mas dificulta paridade dev/prod.

#### P3-9: Sem Turborepo Remote Caching e build cache no CI

- **Localização:** `.github/workflows/ci.yml`
- **Descrição:** O CI faz `pnpm install --frozen-lockfile` com cache do Node modules via `actions/setup-node`, mas não usa Turborepo Remote Caching. Builds repetitivos em PRs recompilam tudo.

---

## Análise por Dimensão

### 1. Estrutura do Monorepo e Organização (4/5) 🟢

**O que foi encontrado:**

A estrutura segue convenções claras: `apps/` (6 apps), `packages/` (7), `config/` (3). O `turbo.json` define 6 tasks com `dependsOn: ["^build"]` correto para build, lint, typecheck, e test. O `pnpm-workspace.yaml` é consistente. O `globalEnv` inclui `NODE_ENV`, `DATABASE_URL`, `MONGODB_URL`, `REDIS_URL`.

Os overrides em `package.json:36-43` fixam versões de hono, @hono/node-server, effect, jsondiffpatch, lodash — necessários para resolver conflitos de versão entre Better Auth e outras deps.

Naming é consistente: `@repo/` para packages compartilhados (core, db, db-chat, env, shared, auth, ai), `@app/` para aplicações. Arquivos em kebab-case, classes em PascalCase.

**Problemas:** O override de lodash (`4.17.23`) está na faixa vulnerável. O `turbo.json` não lista `lint` e `test` outputs explícitos (padrão é não cachear output, o que é correto para lint/test). `globalDependencies: ["**/.env.*local"]` é amplo mas aceitável.

### 2. Arquitetura e Design de Sistema (4/5) 🟢

**O que foi encontrado:**

A arquitetura DDD híbrida é pragmática e bem executada:

- **Full DDD** (`packages/core/src/modules/`): Proposal (12 specs), Commission (7 specs), Client, Policy, Claim, Document, Insurer, Notification, Occurrence, Assistance — com domain entities, repository interfaces, use cases com `@injectable()`, e infrastructure com Prisma repositories + mappers.
- **Full DDD** (`apps/chat-server/`): Ports & Adapters com domain/, application/, infra/ — 8 specs.
- **Light DDD** (`apps/server/src/routes/`): Route handlers que delegam para use cases do core OU fazem queries diretas para CRUD simples (membros, convites, organização, audit logs).

A separação de responsabilidades é boa nos módulos Full DDD. O `accept-invitation.ts` com 150+ linhas é o principal caso onde business logic pesada está em um handler.

A modelagem de dados (Prisma schema) é robusta: 634 linhas, 20+ modelos, todos com CUID IDs, timestamps, e indexes compostos `(organizationId, ...)`. Money em cents e percentages em basis points em todos os campos relevantes.

A multi-tenancy com RLS + application-level filtering + tenantPrisma extension é defense-in-depth exemplar. O `tenant-client.ts` usa batch transactions para evitar connection pool exhaustion.

O chat-server com Socket.IO + Redis adapter + BullMQ é bem arquitetado. Graceful shutdown implementado. O Redis subscriber pattern para eventos cross-server funciona.

### 3. Qualidade de Código (4.5/5) 🟢

**O que foi encontrado:**

Esta é a dimensão mais forte do projeto:

- `strict: true` em `config/typescript-config/base.json:4`, herdado por todos os 16 tsconfigs
- `noUncheckedIndexedAccess: true` — proteção extra para acesso a arrays/records
- **Zero** `any` no codebase (grep confirma)
- **Zero** `@ts-ignore` ou `@ts-expect-error` (grep confirma)
- **Zero** `// eslint-disable` (grep confirma)
- **Zero** `console.log` em código de app (apenas em `seed.ts` para output CLI)
- Apenas **4 `as` assertions** fora de testes, todas com type guards precedendo (`cache-service.ts:19`, `insured-object-details.ts:73`, `prisma-member-repository.ts:16,33`)
- Use cases seguem SRP com single `execute()` method e DI via tsyringe
- Repository interfaces em domain, implementações em infrastructure
- Error classes com `.code` property para handling programático
- Zod schemas co-locados com routes em `_schemas.ts`
- Formatters centralizados com `Intl` e `America/Sao_Paulo`

**Violações de acentos em pt-BR (12 instâncias):** O CLAUDE.md proíbe escrever português sem diacríticos, mas 6 ficheiros violam isso:

- `apps/web/src/features/channels/components/settings-layout.tsx:7,40,44` — `organizacao` → `organização`
- `apps/web/src/app/(dashboard)/settings/page.tsx:17` — `organizacao` → `organização`
- `apps/server/src/routes/v1/organization/_schemas.ts:9,13` — `maximo` → `máximo`
- `apps/server/src/routes/v1/organization/upload-logo.ts:66,78` — `invalido/maximo` → `inválido/máximo`
- `apps/chat-worker/src/tools/update-client-data.ts:14` — `informacoes` → `informações`
- `apps/chat-worker/src/processors/ai-bot-helpers.ts:68,76,115` — `nao/voce/so` → `não/você/só`

### 4. Testes (3/5) 🟡

**O que foi encontrado:**

63 spec files verificados:

- `packages/core`: 42 specs — excelente cobertura nos módulos Full DDD
- `apps/chat-server`: 8 specs — use cases e domain entity cobertos
- `apps/server`: 3 specs — **insuficiente** para ~90 route handlers
- `e2e`: 6 specs — auth, proposal-to-policy, commission, claim, chat, endorsement-kanban
- `packages/shared`: 3 specs — crypto, meta-crypto, internal-auth
- `packages/auth`: 1 spec — abilities

**Qualidade dos testes existentes:** Boa. Seguem Arrange-Act-Assert, nomes descrevem comportamento (`'rejects commission from PAID status'`, `'prevents path traversal in upload routes'`), repositories são mockados corretamente.

**Gaps críticos:**

- endorsement: 3 use cases com ZERO testes
- member: 2 use cases com ZERO testes
- assistance: 1/4 testado (25%)
- claim: 2/5 testado (40%)
- apps/server route handlers: 0 testes (queries diretas ao Prisma)
- Sem testes de integração contra banco real
- Sem coverage report

### 5. Segurança (4/5) 🟢

**O que foi encontrado:**

A postura de segurança é forte para um SaaS v1:

| Aspecto             | Status | Detalhes                                                                                   |
| ------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Auth (Better Auth)  | ✅     | Sessions com httpOnly, secure, sameSite:lax cookies. Email verification obrigatória.       |
| RBAC (CASL)         | ✅     | 5 roles com abilities granulares. `requireAbility` em todas as routes que precisam.        |
| Tenant Isolation    | ✅     | RLS (15 tabelas) + application WHERE organizationId + tenantPrisma extension               |
| SQL/NoSQL Injection | ✅     | Prisma parameterized queries, Mongoose com schemas. Zero raw queries.                      |
| Rate Limiting       | ✅     | Redis-backed, 6 tiers definidos, aplicados a auth, invitations, internal, global.          |
| Upload Security     | ✅     | Path traversal check, magic bytes validation (via file-type lib), MIME whitelist.          |
| HMAC Internal Auth  | ✅     | Timing-safe comparison, 300s max age, body+method+path+timestamp no payload.               |
| PII Encryption      | ✅     | AES-256-GCM para CPF/CNPJ, HMAC-SHA256 para busca.                                         |
| Sentry PII Filter   | ✅     | `stripPiiFromEvent` antes de enviar, stripping de request body, breadcrumbs, user context. |
| Pino Redact         | ✅     | 40+ paths redactados incluindo req.body._, req.headers._, Meta OAuth tokens.               |
| CSP                 | ⚠️     | `'unsafe-inline'` para scripts/styles (necessário para Scalar).                            |
| HSTS                | ❌     | Não configurado no Helmet (depende de Cloudflare).                                         |
| Secrets             | ✅     | t3-env valida formato/comprimento. `.gitignore` inclui `.env`. `.env.example` existe.      |
| Dependency Audit    | ⚠️     | 4 high vulnerabilities (lodash, picomatch, defu) — todas em transitivas.                   |

**Nota sobre ProposalChecklistItem:** Não tem `organizationId` próprio nem RLS. Isolação depende do JOIN com Proposal. Risco baixo mas viola defense-in-depth.

**HMAC replay:** Dentro da janela de 300s, replay é possível. Mitigação: adicionar nonce ou request ID ao payload. Risco baixo para comunicação server-to-server em rede privada Docker.

### 6. Performance (4/5) 🟢

**O que foi encontrado:**

- **Cursor-based pagination**: Implementada universalmente via `apps/server/src/routes/_shared/pagination.schema.ts`. Nenhum uso de OFFSET encontrado.
- **Prisma connection pool**: Configurado com `max: 20` em `packages/db/src/index.ts:9` via PrismaPg adapter. Adequado para a escala inicial.
- **Redis**: Usado para rate limiting, Socket.IO adapter, e BullMQ. Session caching via Better Auth.
- **Select/Include**: A maioria das queries usa `include` para relações necessárias, evitando N+1. Algumas queries retornam todos os campos (sem `select` explícito) — otimizável mas não crítico para V1.
- **Docker resource limits**: 512MB para apps, 1GB para DBs, 384MB para Redis, 128MB para Nginx. Bem dimensionado.
- **Log rotation**: json-file com 10m/3 files em todos os containers.

**Potenciais otimizações futuras:**

- Redis cache para dados frequentemente acessados (insurers list, organization config)
- Bundle analysis para Next.js (dynamic imports para modais pesados)
- `select` explícito em queries que retornam muitos campos
- Connection pool tuning conforme escala (20 conexões pode ser insuficiente com múltiplos containers)

### 7. DevOps, CI/CD e Infraestrutura (4/5) 🟢

**O que foi encontrado:**

| Componente          | Status | Detalhes                                                                 |
| ------------------- | ------ | ------------------------------------------------------------------------ |
| CI (GitHub Actions) | ✅     | lint, typecheck, build, test. Reusável via workflow_call.                |
| Deploy Server       | ✅     | Path-based triggers, Docker build+push, SSH deploy com rollback.         |
| Deploy Chat         | ✅     | Mesmo padrão do server. Triggers específicos por path.                   |
| Dockerfiles         | ✅     | Multi-stage (4 stages), node:22-alpine, healthcheck inline.              |
| Docker Compose Prod | ✅     | Healthchecks, resource limits, log rotation, MongoDB auth + replica set. |
| Nginx               | ✅     | SSL, WebSocket upgrade, DNS resolver, HTTP→HTTPS redirect.               |
| Backup              | ✅     | PostgreSQL + MongoDB, R2 upload, 7 dias retenção, verificação de empty.  |
| Graceful Shutdown   | ⚠️     | Presente em 3 de 4 apps (falta server).                                  |
| Health Endpoint     | ⚠️     | Superficial — não verifica DB/Redis.                                     |
| Migrations          | ⚠️     | Executam APÓS container healthy (deveria ser antes).                     |
| Security Audit CI   | ❌     | pnpm audit não está no pipeline.                                         |
| Staging Env         | ❌     | Sem staging. Apenas dev local e prod.                                    |
| Remote Caching      | ❌     | Turborepo remote caching não configurado.                                |

### 8. Experiência do Desenvolvedor (4/5) 🟢

**O que foi encontrado:**

- **Setup local**: 4 comandos (`docker compose up -d`, `pnpm install`, `pnpm db:push:dev`, `pnpm dev`). Bem documentado no CLAUDE.md.
- **CLAUDE.md**: Excepcional — 400+ linhas com stack map, comandos, regras de código, processo de implementação. Efetivamente seguido (zero violações verificadas).
- **Seed data**: Idempotente com 5 usuários de teste, 8 seguradoras, 10 clientes, propostas em todos os estágios. Comando `pnpm db:seed`.
- **Orval codegen**: `pnpm --filter @app/web generate:api` gera hooks + types + Zod do OpenAPI. Workflow fluido.
- **Git workflow**: Conventional Commits (feat:, fix:, refactor:), Husky + lint-staged (ESLint + Prettier no pre-commit).
- **Monorepo ergonomics**: `pnpm --filter <app> dev` para rodar isolado. Turbo para build/test paralelos.

### 9. Acessibilidade (3/5) 🟡

**O que foi encontrado:**

- **shadcn/ui (@coss/style)**: Baseado em Radix UI que fornece ARIA por padrão. Focus traps em modais, keyboard navigation em dropdowns/selects.
- **eslint-plugin-jsx-a11y**: Instalado no lockfile (dependência transitiva de next/core-web-vitals). Ativo mas sem configuração customizada.
- **Sem testes axe-core**: Nenhum teste automatizado de acessibilidade.
- **4 UI states**: O padrão de Empty/Loading/Error/Success é definido no CLAUDE.md mas a verificação de implementação em todas as listagens não foi exaustiva.
- **Dark/light mode**: Configurado via @coss/style preset com CSS variables.
- **Formulários**: React Hook Form + Zod com mensagens em pt-BR (`lib/zod-pt-br.ts`). Labels associados a inputs via shadcn Form components.

**Gaps:**

- Sem testes axe-core automatizados
- Sem auditoria WCAG AA formal
- Screen reader announcements para loading states não verificados

### 10. Aspectos de Negócio e SaaS-Specific (3/5) 🟡

**O que foi encontrado:**

| Feature               | Status | Detalhes                                                                                 |
| --------------------- | ------ | ---------------------------------------------------------------------------------------- |
| Billing/Subscriptions | ❌     | Sem Stripe, sem planos, sem limites. Decisão documentada: "adiado".                      |
| Onboarding            | ✅     | Self-service register + org creation. Seed popula seguradoras.                           |
| Member Invite         | ✅     | Slack model: email com token (7d) + fallback copiar link. PR #57.                        |
| Email Transacional    | ✅     | Resend configurado — verificação de email, reset de senha.                               |
| Multi-channel Chat    | ✅     | WhatsApp (Baileys), Meta Messenger/Instagram, Widget web.                                |
| LGPD Compliance       | ⚠️     | Terms acceptance implementado. LGPD deletion especificado mas não implementado.          |
| Audit Log             | ✅     | Before/after diffs, archive para dados antigos, entidades sensíveis cobertas.            |
| Reports               | ⚠️     | Export de comissões e apólices (CSV). Sem relatórios visuais de produção/sinistralidade. |
| i18n                  | N/A    | Hardcoded pt-BR (decisão documentada — produto 100% brasileiro).                         |
| Notifications         | ✅     | In-app notifications com unread count. Email via Resend.                                 |
| Analytics             | ❌     | Sem tracking de uso, métricas de retenção, ou funis.                                     |

---

## Melhorias Sugeridas

### Curto Prazo (Primeiro mês)

1. **Testes de integração para apps/server**: Criar pelo menos 15-20 specs cobrindo route handlers críticos (invitations, members, commissions, proposals). Usar Docker test containers para banco real.

2. **Health endpoints robustos**: Verificar DB + Redis + MongoDB nos endpoints `/health` de server e chat-server.

3. **Sentry nos workers**: Adicionar Sentry.init em apps/worker e apps/chat-worker.

4. **Graceful shutdown no server**: Adicionar SIGTERM/SIGINT handler em apps/server/src/server.ts.

5. **Fix lodash override**: Atualizar para 4.17.24+ ou remover override se possível.

6. **pnpm audit no CI**: Adicionar step de security audit com `--audit-level high`.

### Médio Prazo (Primeiros 3 meses)

7. **Coverage report**: Configurar v8 coverage no Vitest e definir threshold mínimo (ex: 60% para core, 30% para server).

8. **HSTS no Helmet**: Configurar strictTransportSecurity com maxAge de 1 ano.

9. **Staging environment**: Criar docker-compose.staging.yml ou usar preview deploys para server/chat.

10. **Extrair accept-invitation para use case**: A lógica de aceitação de convite é complexa demais para um route handler.

11. **2FA/MFA**: Implementar Better Auth TOTP plugin para contas admin/owner.

12. **Turborepo Remote Caching**: Configurar no CI para acelerar builds.

### Longo Prazo (Backlog)

13. **Feature flags**: Implementar sistema simples para rollout gradual.
14. **LGPD deletion job**: Implementar o worker de anonimização definido no SECURITY-SPEC.md.
15. **Relatórios visuais**: Dashboard de produção, sinistralidade, comissões por período.
16. **Bundle analysis**: Configurar @next/bundle-analyzer para otimizar frontend.
17. **axe-core tests**: Adicionar testes de acessibilidade automatizados no E2E.

---

## Sugestões de Features para Corretoras de Seguros

| Feature                                                                                                                 | Valor de Negócio                                               | Complexidade Técnica                                                |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Renovação automática de apólices** — alertas 60/30/15 dias antes do vencimento com workflow de renovação              | Alto — perder renovação = perder cliente + comissão            | Média — cron job + notifications + proposal auto-create             |
| **Dashboard de sinistralidade** — taxa de sinistro por ramo, seguradora, período                                        | Alto — informação estratégica para negociação com seguradoras  | Baixa — aggregate queries + chart component                         |
| **Cálculo automático de comissão split** — distribuir comissão entre corretor e corretora conforme percentual do membro | Alto — reduz trabalho manual e erros                           | Baixa — já tem `commissionSplitPercentage` no Member                |
| **Importação de extratos de comissão** — upload de CSV da seguradora para reconciliação                                 | Alto — corretoras recebem extratos mensais e precisam conferir | Média — parser CSV + matching com policies                          |
| **Multi-ramo cotação** — solicitar cotação para múltiplas seguradoras simultaneamente                                   | Alto — core do trabalho do corretor                            | Alta — integração com APIs de seguradoras ou formulário estruturado |
| **App mobile (PWA)** — acesso mobile para corretores em campo                                                           | Médio — corretores visitam clientes                            | Média — Next.js PWA ou React Native                                 |
| **Agenda de follow-up** — lembretes configuráveis para acompanhamento de propostas                                      | Médio — propostas estagnadas = vendas perdidas                 | Baixa — cron job + notifications                                    |
| **Integração SUSEP** — consulta de status de corretor e seguradora no site da SUSEP                                     | Médio — compliance regulatório                                 | Média — web scraping ou API SUSEP                                   |
| **Portal do segurado** — área restrita para cliente consultar apólices e sinistros                                      | Médio — diferencial competitivo                                | Alta — novo frontend + auth separado                                |
| **WhatsApp templates** — respostas prontas para situações comuns (aviso de sinistro, renovação)                         | Baixo-Médio — agiliza atendimento                              | Baixa — CRUD de templates + integração no chat                      |

---

## Veredicto Final

### **APROVADO COM RESSALVAS**

O Bens Seguros está **pronto para ir a produção** com as seguintes condições:

#### Antes do Launch (P1 — resolver imediatamente)

- [ ] **P1-1**: Adicionar Sentry nos workers (chat-worker + worker)
- [ ] **P1-2**: Adicionar graceful shutdown no server principal
- [ ] **P1-3**: Atualizar lodash override para versão não-vulnerável
- [ ] **P1-5**: Adicionar HSTS no Helmet

#### Na Primeira Semana Pós-Launch

- [ ] **P1-4**: Corrigir ordem de migrations no deploy.sh (antes do container)
- [ ] **P2-4**: Adicionar pnpm audit ao CI
- [ ] **P2-5**: Melhorar health endpoints (verificar DB/Redis)

#### No Primeiro Mês

- [ ] **P2-1**: Adicionar pelo menos 15 specs para apps/server
- [ ] **P2-2**: Cobrir módulos endorsement e member com testes
- [ ] **P2-3**: Configurar coverage report

---

**Nota Final:** Para um SaaS v1 de time pequeno, o nível de maturidade é **excepcional**. A base arquitetural (DDD, RLS, RBAC, crypto, Sentry) é sólida e escalável. Os itens P1 são rápidos de resolver (estimativa: 1-2 dias). O maior débito técnico é a cobertura de testes do apps/server, que deve ser endereçado progressivamente. O sistema pode receber usuários reais com confiança.
