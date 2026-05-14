# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Bens Seguros - Project Guidelines

## Project Overview

Multi-tenant SaaS ERP for Brazilian insurance brokers. Monorepo with 6 apps + 8 packages + 3 config packages.

**Spec:** `docs/ESPECIFICACAO-FINAL.md` | **Plans:** `docs/plans/` | **UI:** `docs/UI-PATTERNS.md` | **Frontend:** `docs/FRONTEND-PATTERNS.md` | **Arch Decisions:** `docs/ARCHITECTURE-DECISIONS.md` | **Chat:** `docs/CHAT-SPEC.md` | **Multi-Channel:** `docs/MULTI-CHANNEL-SETUP.md` | **Security:** `docs/SECURITY-SPEC.md` | **Settings:** `docs/SETTINGS-DESIGN.md` | **Deploy:** `docs/DEPLOY-TUTORIAL.md`

## Development Commands

```bash
# Infrastructure (PostgreSQL 18, MongoDB 8 replica set, Redis 8)
docker compose up -d

# Install dependencies
pnpm install

# Database commands (all from root, auto-load .env)
pnpm db:generate      # Generate Prisma Client
pnpm db:push          # Push schema to DB (dev only)
pnpm db:push:dev      # Push schema + re-apply RLS policies
pnpm db:migrate       # Create migration (production)
pnpm db:seed          # Populate with test data (idempotent)
pnpm db:reset         # Reset DB (drop + migrate + seed)
pnpm db:studio        # Open Prisma Studio GUI

# Run all apps (web :3000, server :3001, chat-server :3002)
pnpm dev

# Run specific app
pnpm --filter @app/server dev
pnpm --filter @app/web dev
pnpm --filter @app/chat-server dev

# Quality gates (run from root)
pnpm lint          # ESLint across all packages
pnpm typecheck     # tsc --noEmit across all packages
pnpm build         # Full build (packages → apps)
pnpm test          # Vitest run across all packages

# Run tests for a specific package/app
pnpm --filter @repo/core test
pnpm --filter @app/chat-server test

# Run a single test file
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/create-proposal.spec.ts

# Watch mode
pnpm --filter @repo/core exec vitest src/modules/proposal/

# Prisma migrations (production — prefer pnpm db:migrate above)
pnpm --filter @repo/db exec prisma migrate dev --name <name>

# Generate API client (hooks + types + Zod) from OpenAPI spec
# Requires server running on :3001
pnpm --filter @app/web generate:api

# Build widget (Vite, outputs to apps/widget/dist/)
pnpm --filter @app/widget build
```

### Ports

| App                | Port | Description                        |
| ------------------ | ---- | ---------------------------------- |
| `@app/web`         | 3000 | Next.js frontend (Turbopack dev)   |
| `@app/server`      | 3001 | Fastify API (ERP backend)          |
| `@app/chat-server` | 3002 | Fastify + Socket.IO (chat backend) |

### Seed Data & Test Credentials

Run `pnpm db:seed` to populate the database with test data (idempotent — skips if data exists).

| Email               | Role       | Password    |
| ------------------- | ---------- | ----------- |
| `test@user.com`     | OWNER      | `Senha@123` |
| `admin@user.com`    | ADMIN      | `Senha@123` |
| `gerente@user.com`  | MANAGER    | `Senha@123` |
| `vendedor@user.com` | COMMERCIAL | `Senha@123` |
| `viewer@user.com`   | VIEWER     | `Senha@123` |

Organization: **Corretora Exemplo** (slug: `corretora-exemplo`). Includes 8 insurers, 10 clients, proposals in all stages, policies, claims, commissions, and notifications.

## App & Package Map

### Apps

| App                | Stack                   | Purpose                                                          |
| ------------------ | ----------------------- | ---------------------------------------------------------------- |
| `apps/server`      | Fastify 5 + tsyringe DI | ERP API — clients, proposals, policies, commissions, documents   |
| `apps/web`         | Next.js 16 + React 19   | Dashboard SPA — all ERP features + settings + chat UI            |
| `apps/chat-server` | Fastify 5 + Socket.IO   | Real-time chat API — conversations, messages, multi-channel      |
| `apps/chat-worker` | BullMQ consumer         | Chat processors — AI responses, Baileys WhatsApp, Meta messaging |
| `apps/worker`      | BullMQ consumer         | ERP processors — PDF generation, email sending, CSV imports      |
| `apps/widget`      | Vite + React 19         | Embeddable web chat widget for customer-facing sites             |

### Packages

| Package                | Purpose                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `packages/core`        | Domain logic (DDD modules: proposal, commission, client, policy, etc.)                                      |
| `packages/db`          | Prisma schema + PostgreSQL client + RLS                                                                     |
| `packages/db-chat`     | Mongoose models + MongoDB connection (conversations, messages, contacts)                                    |
| `packages/auth`        | Better Auth client + CASL abilities (5 roles: OWNER, ADMIN, MANAGER, COMMERCIAL, VIEWER)                    |
| `packages/env`         | t3-env + Zod validated environment variables                                                                |
| `packages/ai`          | Vercel AI SDK wrappers (Claude Sonnet primary)                                                              |
| `packages/shared`      | Cross-app types, constants, crypto, socket events                                                           |
| `packages/aggilizador` | TypeScript SDK for the Aggilizador insurance-quote API (auto branch + FIPE catalog) — used by `apps/server` |

### Config (`config/`)

`eslint-config`, `prettier-config`, `typescript-config` — shared across all apps/packages.

## Tech Stack

- **Runtime:** Node.js 22 LTS | TypeScript 5.9 strict
- **Monorepo:** pnpm 9 + Turborepo
- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui (@coss/style preset)
- **Backend:** Fastify 5 + tsyringe (DI) + Zod
- **Databases:** PostgreSQL 18 (Prisma 7) + MongoDB 8 (Mongoose) + Redis 8
- **Auth:** Better Auth 1.0 + CASL RBAC (5 roles)
- **Real-time:** Socket.IO 4 + Redis adapter
- **Queue:** BullMQ 5
- **AI:** Vercel AI SDK (Claude Sonnet primary)

## Architecture

- **DDD Hybrid:** Full (Proposal, Commission, Conversation) | Light (all others)
- **Multi-tenancy:** PostgreSQL RLS via `app.current_tenant` + MongoDB `tenantId` field
- **Response pattern:** `{ success: true, data, meta }` | `{ success: false, error: { code, message } }`
- **Pagination:** Cursor-based (never offset)

### Module Structure

**`packages/core` (DDD Full modules):** Each module in `src/modules/<name>/` follows:

- `domain/` — Entity, errors, repository interface (port)
- `application/` — Use cases (`@injectable()`, single `execute()` method) + `.spec.ts` tests
- `infrastructure/` — Prisma repository implementation + mapper (`toDomain()`/`toPersistence()`)

**`apps/chat-server` (Ports & Adapters):** Full DDD with:

- `domain/` — Conversation entity, errors, ports (repository interfaces)
- `application/` — Use cases (send-message, assign-conversation, transfer, etc.)
- `infra/` — HTTP routes, Socket.IO handlers, MongoDB repositories, BullMQ queue, Redis pub/sub
- `infra/di/registry.ts` — tsyringe container registration

**`apps/server` (Route per file + Orval):** Routes organized by domain in `src/routes/v1/<domain>/`:

- `_schemas.ts` — Zod schemas (request body, query, params, response) co-located with routes
- `create-client.ts`, `list-clients.ts`, etc. — one route per file using `withTypeProvider<ZodTypeProvider>().route({...})`
- `index.ts` — Fastify plugin that registers all routes + applies `tenantMiddleware`
- `_shared/` — reusable schemas (pagination, params, transforms, enums, response wrappers)
- `handle-domain-error.ts` — centralized domain error → HTTP status mapping
- **OpenAPI spec** auto-generated from route schemas (`/api/docs` via Scalar)
- **Orval** reads OpenAPI spec → generates React Query hooks + types + Zod schemas for frontend (`pnpm --filter @app/web generate:api`)
- Route schemas are the **single source of truth** for frontend types and validation

**Inter-service communication:** `chat-worker` calls `server` API via HMAC-authenticated internal routes (`src/routes/internal/`). Shared secret via `INTERNAL_API_SECRET` env var.

---

## Code Rules

### ABSOLUTE PROHIBITIONS

- **NO `console.log`** — use Pino structured logger. Violation: lint error
- **NO `any` type** — zero tolerance. Use `unknown` + type narrowing. Violation: lint error
- **NO `// eslint-disable`** — fix the code, not the linter. No exceptions
- **NO `// @ts-ignore` or `// @ts-expect-error`** — fix the type, not the compiler
- **NO `as` type assertions** — use type guards, generics, or redesign. Exception: test mocks only
- **NO hardcoded secrets** — use `@repo/env` (t3-env + Zod validated)
- **NO `process.env` in app or package code** — always import `{ env }` from `@repo/env`. Exception: `apps/web` (Next.js client-side uses `process.env.NEXT_PUBLIC_*`)
- **NO `--no-verify` on git hooks** — fix the hook failure
- **NO empty catch blocks** — handle or rethrow with context
- **NO barrel exports that re-export everything** — explicit named exports only
- **NO inline raw HTML injection** — use React components, sanitize with DOMPurify if unavoidable

### TypeScript

- `strict: true` in all tsconfig files, no overrides
- Prefer `interface` over `type` for object shapes (extensibility)
- Use `const` assertions for literal types: `as const`
- Use discriminated unions over optional fields for state variants
- Use `satisfies` operator for type-safe object validation without widening
- Return types: explicit on public API functions, inferred on internal helpers
- Generics: use meaningful names (`TEntity`, `TResult`) not single letters
- Prefer `readonly` on properties that should not be mutated
- Use `Record<string, unknown>` instead of `object` or `{}`
- Use template literal types for string patterns where applicable

### Language Rules

- **Code identifiers (variables, functions, classes, interfaces, types, enums, constants):** always in English
- **Exception:** Brazilian acronyms with no translation — `cpf`, `cnpj`, `cep` — kept as-is
- **Exception:** Adapter implementations that integrate with a Brazilian vendor whose brand is Portuguese may keep the brand in the name, **as long as the English role prefix comes first**. Interfaces/ports stay fully English. Example: `LookupProviderConsultarPlaca implements VehicleLookupProvider`. Do not add a comment to identify the vendor — the class name already does.
- **Code comments:** English
- **UI display strings (labels, messages, placeholders, toasts, titles, tooltips, descriptions):** correct Brazilian Portuguese (pt-BR) with proper accents (á, é, í, ó, ú, ã, õ, ê, ô) and cedilla (ç)
- **NEVER** write Portuguese without diacritics in UI: `organizacao` → `organização`, `obrigatorio` → `obrigatório`, `Comecar Gratis` → `Começar Grátis`
- **Common mistakes to avoid:** `nao` → `não`, `informacoes` → `informações`, `maximo` → `máximo`, `minimo` → `mínimo`, `invalido` → `inválido`, `descricao` → `descrição`

### Naming Conventions

| Element          | Convention                           | Example                                     |
| ---------------- | ------------------------------------ | ------------------------------------------- |
| Files            | kebab-case                           | `create-client.ts`, `client-form.tsx`       |
| Classes          | PascalCase                           | `CreateClient`, `PrismaClientRepository`    |
| Interfaces       | PascalCase (no `I` prefix)           | `ClientRepository`, `StorageProvider`       |
| Types            | PascalCase                           | `ClientData`, `ProposalStage`               |
| Functions        | camelCase                            | `createTenantClient`, `calculateCommission` |
| Variables        | camelCase                            | `premiumValueInCents`, `isAuthenticated`    |
| Constants        | SCREAMING_SNAKE_CASE                 | `SOCKET_EVENTS`, `ROLE_HIERARCHY`           |
| Enums            | PascalCase (members SCREAMING_SNAKE) | `enum Role { OWNER, ADMIN }`                |
| React components | PascalCase                           | `ClientForm`, `ProposalDetail`              |
| Hooks            | camelCase with `use` prefix          | `useClients`, `useAuth`                     |
| Test files       | same as source + `.spec.ts`          | `proposal.spec.ts`                          |
| CSS variables    | kebab-case with `--` prefix          | `--color-primary-500`                       |

### SOLID Principles

- **Single Responsibility:** one class = one reason to change. Use cases do ONE thing
- **Open/Closed:** extend via DI (new repository implementation), not modification
- **Liskov Substitution:** all repository implementations must honor the interface contract
- **Interface Segregation:** small, focused interfaces. `ClientRepository` not `IEverythingRepository`
- **Dependency Inversion:** domain depends on abstractions (ports), never on infrastructure

### Object Calisthenics

1. **One level of indentation per method** — extract to helper if nested deeper
2. **No `else` keyword** — use early returns, guard clauses, or polymorphism
3. **Wrap primitives in domain types** — money in cents (`premiumValueInCents: number`), percentages in basis points
4. **First-class collections** — wrap arrays in typed objects when they carry domain meaning
5. **One dot per line** — no method chaining beyond 2 levels (exceptions: Prisma queries, Zod chains)
6. **Keep entities small** — max 200 lines per class/component. Extract if growing
7. **No classes with more than 2 instance variables** (relaxed: max 5 for entities, DTOs exempt)
8. **No getters/setters that expose internal state** — behavior over data
9. **All classes must be final or abstract** (TS: avoid inheritance, prefer composition)

### Clean Code

- Functions do ONE thing, named by what they do: `advanceProposalStage` not `processProposal`
- Max 3 parameters per function — use an options object beyond that
- No boolean parameters — use separate functions or enums
- No magic numbers — extract to named constants
- No dead code — delete it, git remembers
- No commented-out code — delete it, git remembers
- Comments explain WHY, never WHAT — the code tells what
- Fail fast — validate at boundaries, trust internal code
- Prefer pure functions — minimize side effects, isolate IO at edges

### Error Handling

- Custom error classes with `.code` property for programmatic handling
- Domain errors: `ClientNotFoundError`, `InvalidStageTransitionError`
- HTTP translation: domain error `.code` maps to HTTP status in handler layer
- Never swallow errors — rethrow with context or handle explicitly
- Use Result pattern for expected failures, exceptions for unexpected ones

---

## Architecture Rules

### Environment Variables (`@repo/env`)

- **Single source of truth:** all env vars are defined and validated in `packages/env/src/index.ts` via `@t3-oss/env-core` + Zod
- **Usage:** `import { env } from '@repo/env'` — never `process.env` directly
- **Scope:** all apps (server, chat-server, chat-worker, worker) and packages (shared, auth, db, ai, core) use `@repo/env`
- **Exception:** `apps/web` uses `process.env.NEXT_PUBLIC_*` (Next.js client-side bundling requirement)
- **Adding a new env var:** add to `packages/env/src/index.ts` schema, add commented entry to `.env.example` and `.env.example.prod`, add to vitest configs if required (vars without defaults)
- **AI SDK keys:** passed explicitly via `createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })` — never let SDKs read `process.env` implicitly
- **tsup bundling:** when adding `@repo/env` as a dependency to a workspace package, ensure that package is in `noExternal` in all tsup configs (`apps/server`, `apps/worker`, `apps/chat-server`, `apps/chat-worker`)
- **Test environment:** vitest configs must include `env` block with required vars (`DATABASE_URL`, `MONGODB_URL`, `AUTH_SECRET`, `SOCKET_JWT_SECRET`, `ENCRYPTION_KEY`) since `@repo/env` validates at import time
- **`DATABASE_ADMIN_URL`:** optional in dev, required in prod. Enables the `prismaAdmin` client (superuser) that bypasses RLS — needed for DI container repos and worker jobs without per-request tenant context. Without it in prod, DI repo queries fail silently (RLS blocks them). See Database section for the dual-client pattern.

### Backend (Fastify + Core)

- **Middleware chain:** authMiddleware -> requireAuth -> tenantMiddleware -> requireAbility
- **Route structure:** `routes/v1/<domain>/` with `_schemas.ts` + individual route files + `index.ts`
- **Route pattern:** `app.withTypeProvider<ZodTypeProvider>().route({ method, url, schema: { tags, summary, operationId, body, querystring, params, response }, preHandler, handler })`
- **Shared schemas:** `routes/_shared/` for pagination, params, transforms, enums, response wrappers
- **Handlers:** resolve use case from DI container, translate domain errors to HTTP via `handleDomainError`
- **Use cases:** `@injectable()` class with single `execute()` method
- **Repositories:** interface in `domain/`, implementation in `infrastructure/`
- **Mappers:** `toDomain()` and `toPersistence()` — never leak Prisma types to domain
- **Validation:** Zod schemas in route `schema` block (Fastify validates automatically), domain logic validates business rules
- **OpenAPI:** `@fastify/swagger` + `@scalar/fastify-api-reference` at `/api/docs`. Auto-tag transform assigns tags by URL prefix
- **No business logic in routes or handlers** — delegate to use cases
- **No manual `.parse()` in handlers** — Fastify validates via schema block

### Frontend (Next.js + React)

- **shadcn/ui preset:** `@coss/style` — init with `pnpm dlx shadcn@latest init @coss/style`
- **Use @coss/style components and tokens as base** — customize colors/fonts on top, do not override structure
- **Server Components by default** — `"use client"` only for interactivity
- **Feature-based organization:** `features/<name>/{components,hooks,lib,actions}` (types come from `@/api/model`, constants in `lib/constants.ts`)
- **4 UI states required in every listing:** Empty, Loading, Error, Success
- **Forms:** React Hook Form + Zod schemas from Orval `.zod.ts` files (backend is source of truth). Global pt-BR error map in `lib/zod-pt-br.ts`
- **Data fetching:** Orval-generated React Query hooks from `@/api/endpoints/<domain>/<domain>.ts`. Mutations wrapped with toasts in `features/*/hooks/`. No manual `useQuery`/`useMutation` for REST API calls
- **API types:** Generated by Orval in `@/api/model/`. UI constants (labels, badges) in `features/*/lib/constants.ts` with type aliases from `@/api/model`
- **Code generation:** `pnpm --filter @app/web generate:api` (requires server running on :3001)
- **Global state:** Zustand (minimal, feature-scoped stores)
- **Components max 200 lines** — extract sub-components
- **No prop drilling beyond 2 levels** — use composition or context
- **Accessible by default** — Radix UI handles ARIA, do not break it

### Database

- **Every query must include `organizationId`** — no tenant data leaks
- **Money in cents** (`Int`), percentages in basis points (`Int`) — no floating point
- **Soft delete** on: Client, Proposal, Policy, Commission, Claim (`deletedAt` nullable)
- **All timestamps:** `createdAt` (default now), `updatedAt` (auto)
- **Indexes:** always on `(organizationId, <filter_field>)` combinations
- **Migrations:** Prisma migrate for production, db push for dev only
- **`prisma` vs `prismaAdmin` (from `@repo/db`):** two clients are exported.
  - `prisma` — role `app_user`, RLS enforced via `app.current_tenant`. Used **only** through `createTenantClient()` in request-scoped code with `organizationId` from the request (defense in depth).
  - `prismaAdmin` — superuser via `DATABASE_ADMIN_URL`, bypasses RLS. **Required in `@injectable()` repos (DI container) and worker jobs** — they have no per-request context, so RLS would block all queries. Tenant isolation for these repos depends on the manual `organizationId` filter (already mandatory per this section's rules).
  - Injecting `prisma` directly into a DI repo breaks silently in prod (zero rows returned).

### Testing

- **TDD for DDD Full modules:** write test -> fail -> implement -> pass -> refactor
- **Unit tests:** all use cases, mocked repositories
- **Integration tests:** repositories against real database (Docker test containers)
- **E2E:** Playwright for 6 critical flows only
- **Test names describe behavior:** `it('rejects commission from PAID status')`
- **No test pollution:** each test is independent, no shared mutable state
- **Arrange-Act-Assert pattern** in every test

---

## Processo de Implementacao por Etapa

Cada etapa (task) dos planos em `docs/plans/` segue este fluxo obrigatorio:

### Fase 1: Analise Pre-Implementacao

- **OBRIGATORIO:** Antes de escrever codigo, o agente DEVE ler e analisar a etapa completa
- Identificar ambiguidades, gaps, dependencias nao resolvidas ou contradicoes com outros documentos
- Se houver duvidas: **PERGUNTAR ao usuario antes de implementar** — nunca assumir
- Verificar se a etapa depende de algo que ainda nao foi implementado
- Cross-reference com: `ESPECIFICACAO-FINAL.md`, `CLAUDE.md`, `docs/UI-PATTERNS.md`, `docs/FRONTEND-PATTERNS.md`, `docs/ARCHITECTURE-DECISIONS.md`
- **Carregar skills e docs relevantes para a tarefa** (ver tabela abaixo)

### Fase 1b: Carregar Skills e Documentos por Contexto

**OBRIGATORIO:** O agente DEVE carregar as skills e ler os documentos relevantes ANTES de implementar. Skills contem regras, patterns e anti-patterns que evitam retrabalho.

| Contexto da Tarefa                      | Skills para Carregar                                                                       | Documentos para Ler                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **Frontend (componentes, pages, UI)**   | `frontend-design`, `vercel:shadcn`, `vercel-react-best-practices`, `web-design-guidelines` | `docs/UI-PATTERNS.md`, `docs/FRONTEND-PATTERNS.md`         |
| **Backend (routes, use cases, API)**    | `fastify-best-practices`, `auth-security-audit` (se auth), `orval` (se API client)         | `docs/ARCHITECTURE-DECISIONS.md`, `ESPECIFICACAO-FINAL.md` |
| **Database (schema, migrations, seed)** | —                                                                                          | `docs/ARCHITECTURE-DECISIONS.md` (GAP-2, GAP-5)            |
| **Monorepo (turbo, packages, build)**   | —                                                                                          | `docs/ARCHITECTURE-DECISIONS.md` (GAP-7)                   |
| **Testes**                              | `superpowers:test-driven-development`                                                      | `CLAUDE.md` secao Testing                                  |
| **Design System (cores, tokens, tema)** | `frontend-design`, `vercel:shadcn`                                                         | `docs/UI-PATTERNS.md` secao 1                              |
| **Formularios**                         | `frontend-design`, `vercel:shadcn`                                                         | `docs/UI-PATTERNS.md` secao 3                              |
| **Tabelas e DataTable**                 | `web-design-guidelines`                                                                    | `docs/UI-PATTERNS.md` secao 2                              |
| **Charts e Dashboard**                  | `web-design-guidelines`                                                                    | `docs/UI-PATTERNS.md` secao 1                              |
| **Auth e RBAC**                         | `auth-security-audit`                                                                      | `docs/ARCHITECTURE-DECISIONS.md` (AUTH-1 a AUTH-8)         |
| **Docker e Deploy**                     | `docker-expert`, `multi-stage-dockerfile`, `docker-compose-orchestration`                  | `docs/ARCHITECTURE-DECISIONS.md` (GAP-7)                   |
| **Code Review**                         | `superpowers:requesting-code-review`, `simplify`                                           | `CLAUDE.md` (todas as regras)                              |
| **Debug**                               | `superpowers:systematic-debugging`                                                         | —                                                          |
| **Planning**                            | `superpowers:writing-plans`                                                                | `docs/plans/`                                              |

**Regra:** Se a tarefa envolve frontend visual, as skills `frontend-design` e `web-design-guidelines` sao **obrigatorias**. Elas contem guidelines de design, audits de UI/UX, anti-patterns e checklists que o agente DEVE seguir. Ignorar skills resulta em codigo que nao segue os padroes definidos.

**Regra:** Se a tarefa envolve shadcn/ui, a skill `vercel:shadcn` e **obrigatoria**. Ela contem exemplos, composicoes e customizacoes do preset @coss/style.

**Regra:** Ao implementar componentes React/Next.js, SEMPRE carregar `vercel-react-best-practices`. Ela contem regras de performance priorizadas (waterfalls, bundle size, re-renders, hydration).

### Fase 2: Implementacao

- Seguir TDD quando aplicavel (DDD Full: obrigatorio)
- Commits frequentes (conventional commits)
- Respeitar todas as regras deste CLAUDE.md
- Aplicar as regras das skills carregadas na Fase 1b

### Fase 3: Code Review (agente reviewer)

- Apos implementacao, disparar agente de code review (`superpowers:code-reviewer`)
- Review verifica: SOLID, Clean Code, Object Calisthenics, seguranca, performance, aderencia a spec
- Itens criticos: zero `any`, zero `console.log`, zero `eslint-disable`, naming conventions, max 200 linhas
- Se reviewer reprovar: corrigir e re-submeter

### Fase 4: QA Review (Playwright via MCP)

- Apos code review aprovado, executar testes de QA via MCP Playwright
- Verificar: fluxo funcional end-to-end, 4 estados UI (Empty, Loading, Error, Success)
- Verificar: responsividade (mobile 375px + desktop 1440px), dark mode, acessibilidade basica
- Capturar screenshots para evidencia
- Se QA reprovar: corrigir, re-submeter ao code review, e re-executar QA

### Fase 5: Aprovacao

- **Etapa APROVADA quando TODOS passarem:**
  1. 5 Quality Gates (lint, typecheck, build, test, acceptance)
  2. Code Review aprovado (agente reviewer)
  3. QA Review aprovado (Playwright MCP)
- Somente apos aprovacao o agente pode avancar para a proxima etapa
- Se qualquer gate falhar: **parar, corrigir, re-submeter** — nunca pular

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────┐    ┌───────────┐
│   Analise   │───>│ Implementar  │───>│ Code Review │───>│  QA E2E   │───>│ Aprovado  │
│ (perguntar  │    │ (TDD, commits│    │ (reviewer   │    │(Playwright│    │ (next     │
│  se duvida) │    │  frequentes) │    │  agent)     │    │  MCP)     │    │  etapa)   │
└─────────────┘    └──────────────┘    └──────┬──────┘    └─────┬─────┘    └───────────┘
                          ^                   │                 │
                          │         reprovou  │       reprovou  │
                          └───────────────────┴─────────────────┘
```

---

## Git & CI/CD

- **Workflow:** trunk-based com tag-based release.
  - Feature branch curta (24-48h max) → PR → `main` (squash merge preferido)
  - `main` é sempre verde e sempre deployable, mas **não deploya automaticamente**
  - Push em `main` roda só quality gates no CI (lint, typecheck, build, test) — sem deploy
  - Deploy para prod é disparado por **tag `v*`**:
    ```
    git checkout main && git pull
    git tag -a v1.2.3 -m "Release v1.2.3"
    git push origin v1.2.3
    ```
    A tag `v*` triggera `Deploy Server` + `Deploy Chat` atomicamente (mesmo SHA).
  - Deploy emergencial sem tag: `gh workflow run "Deploy Server"` ou via UI (workflow_dispatch).
- **Conventional Commits:** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- **Branch naming:** `feat/<name>`, `fix/<name>`, `chore/<name>`
- **Pre-commit:** Husky + lint-staged (ESLint + Prettier)
- **5 Quality Gates (must pass before merge):**
  1. `pnpm lint` — zero errors
  2. `pnpm typecheck` — zero errors
  3. `pnpm build` — successful build
  4. `pnpm test` — all tests pass
  5. Acceptance criteria met
- **Never commit:** `.env`, `node_modules/`, credentials, large binaries
- **PR size:** prefer small, focused PRs over large monolithic ones

---

## Performance Guidelines

- **Cursor-based pagination** — never `OFFSET/LIMIT`
- **Database indexes** on all query filter combinations
- **React Query caching** — `staleTime: 60s` default
- **Code splitting** — dynamic imports for heavy components
- **Image optimization** — Next.js `<Image>` component always
- **Lazy loading** — defer non-critical UI (modals, charts, PDF renderer)
- **No N+1 queries** — use Prisma `include` or batch queries
- **Redis cache** for frequently accessed, rarely changed data

## Security Guidelines

- **Zod validation** at every system boundary (HTTP input, env vars, external APIs)
- **Helmet** for HTTP security headers
- **Rate limiting** — 100 req/min global
- **CORS** — restrict to known origins only
- **Cookies** — httpOnly, secure, sameSite
- **Presigned URLs** for document access (time-limited)
- **RLS** for tenant isolation — defense in depth beyond middleware
- **No SQL/NoSQL injection** — parameterized queries only (Prisma/Mongoose handle this)
- **No inline HTML rendering** — use React components; sanitize with DOMPurify if raw HTML is absolutely required
- **CSP headers** — Content Security Policy configured via Helmet
- **Dependency auditing** — run `pnpm audit` regularly, no known critical vulnerabilities
