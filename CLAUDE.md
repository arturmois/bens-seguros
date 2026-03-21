# Bens Seguros - Project Guidelines

## Project Overview

Multi-tenant SaaS ERP for Brazilian insurance brokers. Monorepo with 5 apps + 7 packages.

**Spec:** `ESPECIFICACAO-FINAL.md` | **Plans:** `docs/plans/` | **UI:** `docs/UI-PATTERNS.md` | **Frontend:** `docs/FRONTEND-PATTERNS.md` | **Arch Decisions:** `docs/ARCHITECTURE-DECISIONS.md` | **Chat:** `docs/CHAT-SPEC.md` | **Security:** `docs/SECURITY-SPEC.md` | **Settings:** `docs/SETTINGS-DESIGN.md` | **Reference:** `_reference/`

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

---

## Code Rules

### ABSOLUTE PROHIBITIONS

- **NO `console.log`** — use Pino structured logger. Violation: lint error
- **NO `any` type** — zero tolerance. Use `unknown` + type narrowing. Violation: lint error
- **NO `// eslint-disable`** — fix the code, not the linter. No exceptions
- **NO `// @ts-ignore` or `// @ts-expect-error`** — fix the type, not the compiler
- **NO `as` type assertions** — use type guards, generics, or redesign. Exception: test mocks only
- **NO hardcoded secrets** — use `@repo/env` (t3-env + Zod validated)
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

### Backend (Fastify + Core)

- **Middleware chain:** authMiddleware -> requireAuth -> tenantMiddleware -> requireAbility
- **Route files:** schema + handler + registration in one file per resource
- **Handlers:** resolve use case from DI container, translate domain errors to HTTP
- **Use cases:** `@injectable()` class with single `execute()` method
- **Repositories:** interface in `domain/`, implementation in `infrastructure/`
- **Mappers:** `toDomain()` and `toPersistence()` — never leak Prisma types to domain
- **Validation:** Zod schemas at HTTP boundary, domain logic validates business rules
- **No business logic in routes or handlers** — delegate to use cases

### Frontend (Next.js + React)

- **shadcn/ui preset:** `@coss/style` — init with `pnpm dlx shadcn@latest init @coss/style`
- **Use @coss/style components and tokens as base** — customize colors/fonts on top, do not override structure
- **Server Components by default** — `"use client"` only for interactivity
- **Feature-based organization:** `features/<name>/{components,hooks,lib,types,actions}`
- **4 UI states required in every listing:** Empty, Loading, Error, Success
- **Forms:** React Hook Form + Zod (same schema as backend when possible)
- **Data fetching:** TanStack React Query (no `useEffect` for fetching)
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

### Testing

- **TDD for DDD Full modules:** write test -> fail -> implement -> pass -> refactor
- **Unit tests:** all use cases, mocked repositories
- **Integration tests:** repositories against real database (Docker test containers)
- **E2E:** Playwright for 5 critical flows only
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

| Contexto da Tarefa                      | Skills para Carregar                                                        | Documentos para Ler                                        |
| --------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Frontend (componentes, pages, UI)**   | `ui-ux-pro-max`, `shadcn`, `frontend-design`, `vercel-react-best-practices` | `docs/UI-PATTERNS.md`, `docs/FRONTEND-PATTERNS.md`         |
| **Backend (routes, use cases, API)**    | `better-auth-best-practices` (se auth)                                      | `docs/ARCHITECTURE-DECISIONS.md`, `ESPECIFICACAO-FINAL.md` |
| **Database (schema, migrations, seed)** | `prisma-database-setup`                                                     | `docs/ARCHITECTURE-DECISIONS.md` (GAP-2, GAP-5)            |
| **Monorepo (turbo, packages, build)**   | `turborepo`                                                                 | `docs/ARCHITECTURE-DECISIONS.md` (GAP-7)                   |
| **Testes**                              | `superpowers:test-driven-development`                                       | `CLAUDE.md` secao Testing                                  |
| **Design System (cores, tokens, tema)** | `ui-ux-pro-max`, `shadcn`                                                   | `docs/UI-PATTERNS.md` secao 1                              |
| **Formularios**                         | `ui-ux-pro-max`, `shadcn`                                                   | `docs/UI-PATTERNS.md` secao 3                              |
| **Tabelas e DataTable**                 | `ui-ux-pro-max`                                                             | `docs/UI-PATTERNS.md` secao 2                              |
| **Charts e Dashboard**                  | `ui-ux-pro-max`                                                             | `docs/UI-PATTERNS.md` secao 1                              |
| **Auth e RBAC**                         | `better-auth-best-practices`                                                | `docs/ARCHITECTURE-DECISIONS.md` (AUTH-1 a AUTH-8)         |
| **Docker e Deploy**                     | `turborepo`                                                                 | `docs/ARCHITECTURE-DECISIONS.md` (GAP-7)                   |
| **Code Review**                         | `superpowers:code-reviewer`, `simplify`                                     | `CLAUDE.md` (todas as regras)                              |
| **Debug**                               | `superpowers:systematic-debugging`                                          | —                                                          |
| **Planning**                            | `superpowers:writing-plans`                                                 | `docs/plans/`                                              |

**Regra:** Se a tarefa envolve frontend visual, a skill `ui-ux-pro-max` e **obrigatoria**. Ela contem 99 UX guidelines, anti-patterns, e checklists que o agente DEVE seguir. Ignorar skills resulta em codigo que nao segue os padroes definidos.

**Regra:** Se a tarefa envolve shadcn/ui, a skill `shadcn` e **obrigatoria**. Ela contem exemplos, composicoes e customizacoes do @coss/style preset.

**Regra:** Ao implementar componentes React/Next.js, SEMPRE carregar `vercel-react-best-practices`. Ela contem 62 regras de performance priorizadas (waterfalls, bundle size, re-renders, hydration).

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
