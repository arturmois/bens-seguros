---
name: bens-ddd-module
description: Use ao criar um novo módulo DDD em packages/core (proposal, commission, client, policy, etc.), adicionar use case, criar entity/repository/mapper, ou refatorar DDD Light → DDD Full. Cobre estrutura, padrão @injectable(), mapper, prisma vs prismaAdmin, ordem TDD.
---

# Criando módulos DDD no bens-seguros

## Quando usar

- Criar módulo novo em `packages/core/src/modules/<name>/`
- Adicionar use case a módulo existente (DDD Full)
- Criar entity/repository/mapper
- Refatorar DDD Light → DDD Full
- Antes de gravar arquivo em `packages/core/src/modules/`

## Estrutura de pastas

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

## Ordem de criação (TDD obrigatório em DDD Full)

1. `domain/<name>.ts` — Entity com private constructor + factory `create()` estática
2. `domain/<name>-errors.ts` — Custom errors com `.code` property
3. `domain/<name>-repository.ts` — Interface (port)
4. `application/<use-case>.spec.ts` — Test RED primeiro (AAA, mock repo)
5. `application/<use-case>.ts` — `@injectable()` use case com `execute()` até GREEN
6. `infrastructure/<name>-mapper.ts` — `toDomain()` e `toPersistence()`
7. `infrastructure/prisma-<name>-repository.ts` — usa `prismaAdmin` (DI repo)
8. Registrar repo em `apps/server/src/container-registrations.ts`
9. Repetir 4-5 para cada use case adicional

## Regras críticas

### prisma vs prismaAdmin

- **`prisma` vs `prismaAdmin` (from `@repo/db`):** two clients are exported.
  - `prisma` — role `app_user`, RLS enforced via `app.current_tenant`. Used **only** through `createTenantClient()` in request-scoped code with `organizationId` from the request (defense in depth).
  - `prismaAdmin` — superuser via `DATABASE_ADMIN_URL`, bypasses RLS. **Required in `@injectable()` repos (DI container) and worker jobs** — they have no per-request context, so RLS would block all queries. Tenant isolation for these repos depends on the manual `organizationId` filter (already mandatory per this section's rules).
  - Injecting `prisma` directly into a DI repo breaks silently in prod (zero rows returned).

### Backend pattern

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

### Database

- **Every query must include `organizationId`** — no tenant data leaks
- **Money in cents** (`Int`), percentages in basis points (`Int`) — no floating point
- **Soft delete** on: Client, Proposal, Policy, Commission, Claim (`deletedAt` nullable)
- **All timestamps:** `createdAt` (default now), `updatedAt` (auto)
- **Indexes:** always on `(organizationId, <filter_field>)` combinations
- **Migrations:** Prisma migrate for production, db push for dev only
- **Prisma client choice:** ver `### prisma vs prismaAdmin` acima — em repos DI sempre `prismaAdmin`.

### Testing

- **TDD for DDD Full modules:** write test -> fail -> implement -> pass -> refactor
- **Unit tests:** all use cases, mocked repositories
- **Integration tests:** repositories against real database (Docker test containers)
- **E2E:** Playwright for 6 critical flows only
- **Test names describe behavior:** `it('rejects commission from PAID status')`
- **No test pollution:** each test is independent, no shared mutable state
- **Arrange-Act-Assert pattern** in every test

## Exemplo concreto (referência)

Para ver o padrão completo aplicado, ler:

- `packages/core/src/modules/proposal/` — DDD Full mais maduro do monorepo
- `packages/core/src/modules/commission/` — outro exemplo de DDD Full
- `packages/core/src/modules/client/` — DDD Light (sem application/, repo direto)

## Checklist antes de commit

- [ ] Entity max 200 linhas, sem public setters
- [ ] Use case: single `execute()` method
- [ ] Repository interface em `domain/`, implementação em `infrastructure/`
- [ ] Mapper não leakar tipos Prisma pro domain
- [ ] Tests com nomes descritivos de comportamento
- [ ] Money em cents (`Int`), % em basis points
- [ ] Repo DI usa `prismaAdmin` (não `prisma`)
- [ ] `organizationId` em toda query
- [ ] Repo registrado em `container-registrations.ts`
