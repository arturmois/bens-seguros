# Phase 2 — Composition foundation checks

Profile: light
Plan: `.specs/features/phase-2-composition/plan.md`

28 checks in 3 slices · 2 one-way doors · 0 open, of which 0 block

## Checks

Grouped by the spec's slices; numbering runs across the whole feature.

### S1 - Compose `clients` without tsyringe (T2.1) · ~25 files · ~90k

**C1** - `composeClients(repo)` returns an object whose keys are exactly `createClient`, `listClients`, `getClient`, `updateClient`, `deleteClient`, `lgpdDeleteClient`, `exportClientsCsv`, `parseClientImport` (COMP-01, AC 1, door 1)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/client/compose-clients.spec.ts -t "composeClients returns the eight ClientsApi keys"`

**C2** - `composeClients` with a fake `ClientRepository` returns `getClient` whose `execute({ id, organizationId })` is the `GetClient` contract (COMP-01, AC 2, door 1)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/client/compose-clients.spec.ts -t "composeClients getClient.execute is GetClient"`

**C3** - `packages/core/src/modules/client/application/get-client.ts` does not contain `tsyringe`, `@injectable`, or `@inject` (COMP-02, AC 3)
Proof: `node --test --test-name-pattern "get-client.ts has no tsyringe" scripts/phase-2-composition.test.mjs`

**C4** - zero files under `packages/core/src/modules/client/` import `tsyringe` (COMP-02, AC 4)
Proof: `node --test --test-name-pattern "modules/client has no tsyringe import" scripts/phase-2-composition.test.mjs`

**C5** - `rg "container\\.resolve" apps/server/src/routes/v1/clients` prints zero matching lines (COMP-03, AC 5)
Proof: `node --test --test-name-pattern "v1 client routes have no container.resolve" scripts/phase-2-composition.test.mjs`

**C6** - `getClientRoute` takes a second parameter of the composed clients API and calls `clients.getClient.execute` (COMP-03, AC 6, door 1)
Proof: `node --test --test-name-pattern "getClientRoute calls clients.getClient.execute" scripts/phase-2-composition.test.mjs`

**C7** - `createClientRoute`, `listClientsRoute`, `updateClientRoute`, `deleteClientRoute`, `lgpdDeleteClientRoute`, `exportClientsRoute`, and `importClientsRoutes` take the composed clients API and do not import `container` from `@repo/core` (COMP-03, AC 7)
Proof: `node --test --test-name-pattern "client route files take ClientsApi and do not import container" scripts/phase-2-composition.test.mjs`

**C8** - `apps/server/src/app.ts` registers client HTTP routes by passing the composed `ClientsApi` and does not call `clientRoutes(app)` with no clients argument (COMP-03, AC 8)
Proof: `node --test --test-name-pattern "app.ts registers createClientRoutes with ClientsApi" scripts/phase-2-composition.test.mjs`

**C9** - `container-registrations.ts` still contains `container.register('ClientRepository'` and does not contain `container.register(GetClient`, `container.register(CreateClient`, `container.register(ListClients`, `container.register(UpdateClient`, `container.register(DeleteClient`, `container.register(ExportClientsCsv`, or `container.register(ParseClientImport` (COMP-04, AC 9)
Proof: `node --test --test-name-pattern "container keeps ClientRepository token and drops client use-case class registers" scripts/phase-2-composition.test.mjs`

**C10** - client application specs still construct use cases with `new GetClient(repo)` or the sibling class (COMP-05, AC 10)
Proof: `node --test --test-name-pattern "client application specs construct with new" scripts/phase-2-composition.test.mjs`

**C11** - v1 client route specs pass a fake `ClientsApi` into the route under test and do not call `mockResolve` / `container.resolve` to stub the client use case (COMP-05, AC 11)
Proof: `node --test --test-name-pattern "client route specs pass fake ClientsApi and skip mockResolve" scripts/phase-2-composition.test.mjs`

**C12** - `GetClient.execute` with an id the repository does not find throws an error whose `code` is `CLIENT_NOT_FOUND` (COMP-05, AC 12)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/client/application/get-client.spec.ts -t "throws ClientNotFoundError when client does not exist"`

**C13** - OpenAPI `operationId` values `getClient`, `listClients`, `createClient`, `updateClient`, `deleteClient`, `lgpdDeleteClient`, `exportClients`, `importTemplateClients` remain on the same method and URL as today (HTTP-01, AC 13)
Proof: `node --test --test-name-pattern "client operationIds stay on the same method and URL" scripts/phase-2-composition.test.mjs`

### S2 - Server boot composition spec (T2.2) · 2 files · ~15k

**C14** - `apps/server/src/bootstrap/compose.ts` exports a function that, given a `ClientRepository`, returns a graph object that includes the `ClientsApi` from `composeClients` (BOOT-01, AC 14)
Proof: `pnpm --filter @app/server exec vitest run src/bootstrap/compose.spec.ts -t "composeServerClients returns ClientsApi from composeClients"`

**C15** - `compose.spec.ts` constructs that graph with a fake `ClientRepository` and registers `createClientRoutes` on a Fastify instance without throwing (BOOT-01, AC 15)
Proof: `pnpm --filter @app/server exec vitest run src/bootstrap/compose.spec.ts -t "createClientRoutes registers from composed graph"`

**C16** - `compose.spec.ts` enumerates required keys including `deleteClient` (BOOT-01, AC 16)
Proof: `pnpm --filter @app/server exec vitest run src/bootstrap/compose.spec.ts -t "composed graph requires deleteClient"`

**C17** - `compose.spec.ts` enumerates required keys including `lgpdDeleteClient` (BOOT-01, AC 17)
Proof: `pnpm --filter @app/server exec vitest run src/bootstrap/compose.spec.ts -t "composed graph requires lgpdDeleteClient"`

### S3 - Workspace public API drops Prisma adapters (T2.3) · ~10 files · ~40k

**C18** - `packages/core/src/modules/workspace/index.ts` does not export `PrismaOrganizationRepository`, `PrismaMemberRepository`, or `PrismaInvitationRepository` (SURF-01, AC 18, door 2)
Proof: `node --test --test-name-pattern "workspace index does not export Prisma adapters" scripts/phase-2-composition.test.mjs`

**C19** - `PrismaMemberRepository` is not a named export of `@repo/core` (SURF-01, AC 19, door 2)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/workspace/public-exports.spec.ts -t "PrismaMemberRepository is not exported from @repo/core"`

**C20** - `packages/core/package.json` `exports` contains `./workspace/infrastructure` whose target re-exports the three Prisma workspace repositories (SURF-01, AC 20, door 2)
Proof: `node --test --test-name-pattern "core exports workspace/infrastructure re-exports three Prisma repos" scripts/phase-2-composition.test.mjs`

**C21** - `container-registrations.ts` imports `PrismaOrganizationRepository`, `PrismaMemberRepository`, and `PrismaInvitationRepository` from `@repo/core/workspace/infrastructure` and does not import those three names from `@repo/core` (SURF-01, AC 21, door 2)
Proof: `node --test --test-name-pattern "container-registrations imports workspace Prisma from infrastructure subpath" scripts/phase-2-composition.test.mjs`

**C22** - `composeWorkspace` accepts the three workspace repositories plus `cacheService`, `storageProvider`, and `invitationEmailNotifier`, and returns an object that includes `getOrganization`, `listMembers`, and `createInvitation` (SURF-02, AC 22, door 2)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/workspace/compose-workspace.spec.ts -t "composeWorkspace returns getOrganization listMembers createInvitation"`

**C23** - `.dependency-cruiser.cjs` contains forbidden rule `no-core-infrastructure-from-apps` with `severity` `warn`, `from` matching `apps/server/src`, `to` matching core module `infrastructure` paths, and `pathNot` excluding `container-registrations.ts` and `apps/server/src/bootstrap` (SURF-03, AC 23, door 2)
Proof: `node --test --test-name-pattern "cruiser rule no-core-infrastructure-from-apps is warn with allowlist" scripts/phase-2-composition.test.mjs`

**C24** - an isolated fixture file at `apps/server/src/routes/v1/canary-forbidden-infrastructure-import.ts` that imports a core module `infrastructure` file is reported by that new rule (SURF-03, AC 24)
Proof: `node --test --test-name-pattern "canary reports no-core-infrastructure-from-apps" scripts/phase-2-composition.test.mjs`

**C25** - `depcruise` on `container-registrations.ts` importing `@repo/core/workspace/infrastructure` does not report `no-core-infrastructure-from-apps` for that file (SURF-03, AC 25)
Proof: `node --test --test-name-pattern "container-registrations is allowlisted for workspace infrastructure" scripts/phase-2-composition.test.mjs`

**C26** - `docs/architecture/forbidden-deps.md` names the temporary allowlist `container-registrations.ts` and `bootstrap/` and states it clears when T6.1/T6.2 land (SURF-03, AC 26)
Proof: `node --test --test-name-pattern "forbidden-deps documents infrastructure allowlist until T6" scripts/phase-2-composition.test.mjs`

**C27** - workspace v1 `GET /api/v1/members` still returns 200 with a paginated list (handlers may still `container.resolve`) (SURF-04, AC 27)
Proof: `pnpm --filter @app/server exec vitest run src/routes/v1/members/__tests__/list-members.spec.ts -t "returns 200 with paginated member list"`

**C28** - `bens-ddd-module` skill states that `packages/core/src/modules/client` is composed with `composeClients` and does not require `@injectable` on new client use cases (SURF-04, AC 28)
Proof: `node --test --test-name-pattern "bens-ddd-module names composeClients for modules/client" scripts/phase-2-composition.test.mjs`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| Landing doors (2) | ClientsApi compose C1, C6 · workspace Prisma off public index C18, C20, C23 | - |
| `ClientsApi` keys (8) | C1, table-driven over all 8 | - |
| client route files without `container.resolve` (8) | C5, table-driven over all 8 | - |
| client route files without `container` import (7) | C7, table-driven over all 7 | - |
| dropped `container.register(UseCase` names (7) | C9, table-driven over all 7 | - |
| frozen `operationId` + method + URL (8) | C13, table-driven over all 8 | - |
| boot required keys (2) | `deleteClient` C16 · `lgpdDeleteClient` C17 | - |
| workspace Prisma names removed from public index (3) | C18, table-driven over all 3 | - |
| `composeWorkspace` required keys (3) | C22, table-driven over all 3 | - |
| cruiser allowlist places (2) | `container-registrations.ts` C25 · `bootstrap/` C23 | - |

- Claims naming a file path or package export: C3, C4, C8, C9, C18, C19, C20, C21 - each has a proof that reads that file or imports the package
- Claims naming a Vitest example: C1, C2, C12, C14, C15, C16, C17, C22, C27 - each has a proof that names that example
- No other check claims more than the single case its proof exercises

## Swept

- validation: C1, C13
- failure modes: C12
- idempotency: n/a - no new write path or duplicate key; compose is in-process construction
- authorization: existing - `requireAbility` on v1 client routes is unchanged (HTTP frozen)
- concurrency: n/a - composition runs once at boot; no concurrent compose
- data lifecycle: n/a - no stored-data shape change
- dependency failure: n/a - no new external I/O; Prisma stays behind the existing repository
- state transitions: n/a - no state machine in this phase
- observability: n/a - no new log or metric requirement

## Handoff

Intended split, with the arithmetic, written before any code:

- S1 (compose-clients, strip tsyringe, v1 client routes, container leftover token, file-shape proofs) ≈ 90k. S2 (bootstrap/compose + spec) ≈ 15k. S3 (workspace index, infrastructure export, composeWorkspace, cruiser rule, skill) ≈ 40k. Combined under 150k. One builder, three commits matching the plan (T2.1, T2.2, T2.3). No hand-off.
