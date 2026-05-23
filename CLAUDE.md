# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Bens Seguros — Project Guidelines

## Project Overview

Multi-tenant SaaS ERP for Brazilian insurance brokers. Monorepo with 6 apps + 8 packages + 3 config packages.

**Specs:** `docs/ESPECIFICACAO-FINAL.md` | **Plans:** `docs/superpowers/plans/` | **UI:** `docs/UI-PATTERNS.md` | **Frontend:** `docs/FRONTEND-PATTERNS.md` | **Arch:** `docs/ARCHITECTURE-DECISIONS.md` | **Chat:** `docs/CHAT-SPEC.md` | **Multi-Channel:** `docs/MULTI-CHANNEL-SETUP.md` | **Security:** `docs/SECURITY-SPEC.md` | **Settings:** `docs/SETTINGS-DESIGN.md` | **Deploy:** `docs/DEPLOY-TUTORIAL.md`

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
pnpm db:reset         # Reset DB (drop + migrate + seed) — ATENÇÃO: NÃO reaplica RLS
pnpm db:studio        # Open Prisma Studio GUI

# Após db:reset, RLS precisa ser reaplicado manualmente, senão server :3001
# crasha em loop no startup e login falha silenciosamente:
psql "$DATABASE_URL" -f packages/db/prisma/rls-policies.sql
# (alternativa: usar pnpm db:push:dev, que já reaplica RLS)

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
pnpm test:watch    # Vitest watch across all packages
pnpm format        # Prettier --write em **/*.{ts,tsx}

# Run tests for a specific package/app
pnpm --filter @repo/core test
pnpm --filter @app/chat-server test

# Run a single test file
pnpm --filter @repo/core exec vitest run src/modules/proposal/application/list-proposals.spec.ts

# Watch mode
pnpm --filter @repo/core exec vitest src/modules/proposal/

# E2E (raramente usado — QA padrão é Playwright via MCP, não .spec.ts)
pnpm --filter @app/web test:e2e

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
- **Observability:** Sentry (`@sentry/nextjs` + Sentry MCP plugin)

## Architecture (high-level)

- **DDD Hybrid:** Full (Proposal, Commission, Conversation) | Light (all others) — detalhes em skill `bens-ddd-module`
- **Multi-tenancy:** PostgreSQL RLS via `app.current_tenant` + MongoDB `tenantId` field
- **Response pattern:** `{ success: true, data, meta }` | `{ success: false, error: { code, message } }`
- **Pagination:** cursor-based, never `OFFSET/LIMIT`
- **Inter-service:** `chat-worker` calls `server` API via HMAC-authenticated internal routes (`src/routes/internal/`), shared secret via `INTERNAL_API_SECRET`

## Environment Variables (`@repo/env`)

- **Single source of truth:** `packages/env/src/index.ts` via `@t3-oss/env-core` + Zod
- **Usage:** `import { env } from '@repo/env'` — never `process.env` directly. Exceção: `apps/web` usa `process.env.NEXT_PUBLIC_*` (Next.js client-side bundling)
- **Adding a new env var:** schema em `packages/env/src/index.ts` + entry em `.env.example` e `.env.example.prod` + vitest configs (vars sem defaults)
- **AI SDK keys:** passe explicitamente via `createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })` — nunca deixe SDK ler `process.env`
- **tsup bundling:** quando adicionar `@repo/env` como dependency, incluir o package em `noExternal` nos tsup configs (server, worker, chat-server, chat-worker)
- **Test environment:** vitest configs devem ter `env` block com vars obrigatórias (`DATABASE_URL`, `MONGODB_URL`, `AUTH_SECRET`, `SOCKET_JWT_SECRET`, `ENCRYPTION_KEY`)
- **`DATABASE_ADMIN_URL`:** opcional em dev, obrigatório em prod. Habilita `prismaAdmin` (superuser, bypassa RLS) usado em DI repos e worker jobs. Sem ele em prod, queries de DI repo falham silenciosamente. Ver skill `bens-ddd-module` para padrão `prisma` vs `prismaAdmin`.

## Frontend (Next.js + React) — resumo

- **shadcn/ui preset:** `@coss/style` — init com `pnpm dlx shadcn@latest init @coss/style`. Use componentes/tokens como base, customize cores/fonts por cima, não sobrescreva estrutura
- **Server Components by default** — `"use client"` só para interatividade
- **Feature-based organization:** `features/<name>/{components,hooks,lib,actions}` (types vêm de `@/api/model`, constants em `lib/constants.ts`)
- **4 UI states obrigatórios em toda listing:** Empty, Loading, Error, Success
- **Forms:** React Hook Form + Zod schemas dos `.zod.ts` gerados pelo Orval (backend = source of truth). Global pt-BR error map em `lib/zod-pt-br.ts`
- **Data fetching:** hooks gerados pelo Orval em `@/api/endpoints/<domain>/<domain>.ts`. Mutations envolvidas com toasts em `features/*/hooks/`. Sem `useQuery`/`useMutation` manuais para REST
- **API types:** gerados pelo Orval em `@/api/model/`. UI constants (labels, badges) em `features/*/lib/constants.ts` com type aliases de `@/api/model`
- **Code generation:** `pnpm --filter @app/web generate:api` (requer server :3001)
- **Global state:** Zustand (minimal, feature-scoped stores)
- **Components max 200 linhas** — extrair sub-components
- **Sem prop drilling > 2 níveis** — composition ou context
- **Accessible by default** — Radix UI cuida da ARIA, não quebre

Detalhes em `docs/FRONTEND-PATTERNS.md` e `docs/UI-PATTERNS.md`.

## ABSOLUTE PROHIBITIONS

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

## Language Rules (resumo crítico)

- **Code identifiers:** English. Exceção: Brazilian acronyms (`cpf`, `cnpj`, `cep`).
- **Code comments:** English.
- **UI strings:** Brazilian Portuguese com diacritics corretos (á, é, í, ó, ú, ã, õ, ê, ô, ç). NUNCA `nao`, `informacoes`, `maximo`, `minimo`, `invalido`, `descricao`, `organizacao`, `obrigatorio`.
- Detalhes completos + exceções → skill `bens-code-rules`.

## Naming Conventions (resumo)

| Element                  | Convention                  | Example                            |
| ------------------------ | --------------------------- | ---------------------------------- |
| Files                    | kebab-case                  | `create-client.ts`                 |
| Classes/Types/Interfaces | PascalCase (sem `I` prefix) | `CreateClient`, `ClientRepository` |
| Functions/Variables      | camelCase                   | `createTenantClient`               |
| Constants                | SCREAMING_SNAKE_CASE        | `SOCKET_EVENTS`                    |
| React components         | PascalCase                  | `ClientForm`                       |
| Hooks                    | camelCase com `use` prefix  | `useClients`                       |
| Test files               | source + `.spec.ts`         | `proposal.spec.ts`                 |

Detalhes completos → skill `bens-code-rules`.

## Git & CI/CD

- **Workflow:** trunk-based + tag-based release. `main` sempre verde, deployavel mas não deploya automático. Deploy = tag `v*`.
- **Conventional Commits:** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- **Branch naming:** `feat/<name>`, `fix/<name>`, `chore/<name>`
- **Pre-commit:** Husky + lint-staged
- **5 Quality Gates antes de merge:**
  1. `pnpm lint` — zero errors
  2. `pnpm typecheck` — zero errors
  3. `pnpm build` — successful
  4. `pnpm test` — all pass
  5. Acceptance criteria met
- **Never commit:** `.env`, `node_modules/`, credentials, large binaries
- **Never use `--no-verify`** — fix the hook failure

## Para tarefas específicas, carregue a skill apropriada

- **Implementar ticket Jira de ponta a ponta (autônomo)** → skill `bens-orchestrator` (via `/work SCRUM-XX`)
- **Criar módulo DDD / use case / repository / entity** → skill `bens-ddd-module`
- **Implementar etapa de plano (5 fases obrigatórias)** → skill `bens-implementation-flow`
- **Code review / refactor / regras detalhadas de código** → skill `bens-code-rules`
- **Frontend UI / componentes / pages** → skill `frontend-design` + ler `docs/UI-PATTERNS.md`, `docs/FRONTEND-PATTERNS.md`
- **shadcn/ui** → skill `vercel:shadcn` (preset `@coss/style`)
- **React/Next.js performance** → skill `vercel-react-best-practices`
- **Auth / RBAC / segurança** → skill `auth-security-audit` + ler `docs/ARCHITECTURE-DECISIONS.md` (AUTH-1 a AUTH-8)
- **Fastify / API / use cases** → skill `fastify-best-practices`
- **Orval / API client gen** → skill `orval` + slash `/regen-api`
- **CI/Deploy/Docker** → skill `docker-expert`, `multi-stage-dockerfile`, `docker-compose-orchestration`
- **Gerar versão / release / tag de prod** → skill `bens-release`
- **CI quebrou / pipeline falhou** → skill `check-pipeline`
- **TDD / testes** → skill `superpowers:test-driven-development`
- **Plano / brainstorming** → skill `superpowers:writing-plans`, `superpowers:brainstorming`
- **Debug** → skill `superpowers:systematic-debugging`
- **Code review estruturado de diff** → subagent `bens-code-reviewer`

## Doc index

| Doc                              | Tópico                                               |
| -------------------------------- | ---------------------------------------------------- |
| `docs/ESPECIFICACAO-FINAL.md`    | Especificação completa do produto                    |
| `docs/superpowers/plans/`        | Planos de implementação                              |
| `docs/superpowers/specs/`        | Specs de brainstorming                               |
| `docs/UI-PATTERNS.md`            | Padrões de UI (Design system, forms, tables, charts) |
| `docs/FRONTEND-PATTERNS.md`      | Padrões frontend (data fetching, state, errors)      |
| `docs/ARCHITECTURE-DECISIONS.md` | Decisões arquiteturais (gaps, auth, db, monorepo)    |
| `docs/CHAT-SPEC.md`              | Spec do chat-server                                  |
| `docs/MULTI-CHANNEL-SETUP.md`    | Setup multi-canal (WhatsApp, web widget, Meta)       |
| `docs/SECURITY-SPEC.md`          | Spec de segurança                                    |
| `docs/SETTINGS-DESIGN.md`        | Design das settings                                  |
| `docs/DEPLOY-TUTORIAL.md`        | Tutorial de deploy (trunk + tag-based)               |
