# Phase 2 — Composition foundation verification

**Verdict**: PASS
**Profile**: light
**Diff range**: 25b54315..HEAD
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Fault injection was not run because profile is light, so a missing Faults injected killed-mutant table is not a forgotten step. Coverage was not recomputed from authority (light). Binding sources were not opened as a required section (standard/ui only).

Fix scoped to `871eefa9..21ad389c`: `scripts/phase-2-composition.test.mjs`, `apps/server/src/bootstrap/compose.spec.ts`. Round 1 non-PASS: C11, C15 — re-judged at `21ad389c`. Other check verdicts carried from `871eefa9` except those whose proof file was touched (those get refreshed citations).

Proofs re-run in full at HEAD `21ad389c403c9ac85c3d53632a53e575cd8a653b` by the verifier (not the author's claim):

`node --test --test-reporter spec scripts/phase-2-composition.test.mjs`

18 tests, 18 pass, 0 fail. Named patterns as `✔`:

- `get-client.ts has no tsyringe`
- `modules/client has no tsyringe import`
- `v1 client routes have no container.resolve`
- `getClientRoute calls clients.getClient.execute`
- `client route files take ClientsApi and do not import container`
- `app.ts registers createClientRoutes with ClientsApi`
- `container keeps ClientRepository token and drops client use-case class registers`
- `client application specs construct with new`
- `client route specs pass fake ClientsApi and skip mockResolve`
- `client operationIds stay on the same method and URL`
- `workspace index does not export Prisma adapters`
- `core exports workspace/infrastructure re-exports three Prisma repos`
- `container-registrations imports workspace Prisma from infrastructure subpath`
- `cruiser rule no-core-infrastructure-from-apps is warn with allowlist`
- `canary reports no-core-infrastructure-from-apps`
- `container-registrations is allowlisted for workspace infrastructure`
- `forbidden-deps documents infrastructure allowlist until T6`
- `bens-ddd-module names composeClients for modules/client`

`pnpm --filter @repo/core exec vitest run src/modules/client/compose-clients.spec.ts src/modules/client/application/get-client.spec.ts src/modules/workspace/public-exports.spec.ts src/modules/workspace/compose-workspace.spec.ts --reporter=verbose`

6 tests, 6 pass, 0 fail. Names as `✓`:

- `composeClients returns the eight ClientsApi keys`
- `composeClients getClient.execute is GetClient`
- `throws ClientNotFoundError when client does not exist`
- `PrismaMemberRepository is not exported from @repo/core`
- `composeWorkspace returns getOrganization listMembers createInvitation`
- (`returns client with metrics when found` also ran; not a named check)

`pnpm --filter @app/server exec vitest run src/bootstrap/compose.spec.ts src/routes/v1/members/__tests__/list-members.spec.ts --reporter=verbose`

9 tests, 9 pass, 0 fail. Names as `✓`:

- `composeServerClients returns ClientsApi from composeClients`
- `createClientRoutes registers from composed graph`
- `composed graph requires deleteClient`
- `composed graph requires lgpdDeleteClient`
- `returns 200 with paginated member list`
- (four extra list-members examples also ran; not named checks)

## Checks

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `composeClients(repo)` keys are exactly the eight `ClientsApi` names | carried from `871eefa9`; `✓ composeClients returns the eight ClientsApi keys` | `packages/core/src/modules/client/compose-clients.spec.ts:33` - `expect(Object.keys(api).sort()).toEqual([...CLIENTS_API_KEYS].sort())` with `CLIENTS_API_KEYS` `:6-15` the eight names | PASS |
| C2 | fake repo yields `getClient.execute({ id, organizationId })` as the `GetClient` contract | carried from `871eefa9`; `✓ composeClients getClient.execute is GetClient` | `packages/core/src/modules/client/compose-clients.spec.ts:39` - `expect(api.getClient).toBeInstanceOf(GetClient)`; `:41` - `api.getClient.execute({ id: 'missing', organizationId: 'org-1' })` | PASS |
| C3 | `get-client.ts` has no `tsyringe`, `@injectable`, or `@inject` | carried from `871eefa9`; `✔ get-client.ts has no tsyringe` | `scripts/phase-2-composition.test.mjs:41-43` - `assert.doesNotMatch(text, /tsyringe/)`; `assert.doesNotMatch(text, /@injectable/)`; `assert.doesNotMatch(text, /@inject/)` | PASS |
| C4 | zero files under `modules/client/` import `tsyringe` | carried from `871eefa9`; `✔ modules/client has no tsyringe import` | `scripts/phase-2-composition.test.mjs:49-51` - `assert.doesNotMatch(text, /from ['"]tsyringe['"]/)` per walked `.ts` file | PASS |
| C5 | `container.resolve` absent under v1 client routes | carried from `871eefa9`; `✔ v1 client routes have no container.resolve` | `scripts/phase-2-composition.test.mjs:60-62` - `assert.doesNotMatch(text, /container\.resolve/)` per walked route `.ts` file | PASS |
| C6 | `getClientRoute` takes `ClientsApi` and calls `clients.getClient.execute` | carried from `871eefa9`; `✔ getClientRoute calls clients.getClient.execute` | `scripts/phase-2-composition.test.mjs:70-72` - `assert.match(text, /export function getClientRoute\(/)`; `assert.match(text, /clients: ClientsApi/)`; `assert.match(text, /clients\.getClient\.execute/)` | PASS |
| C7 | seven sibling route files take `ClientsApi` and do not import `container` | carried from `871eefa9`; `✔ client route files take ClientsApi and do not import container` | `scripts/phase-2-composition.test.mjs:89-103` - for each of 7 files: `assert.match(text, /clients: ClientsApi/)`; `assert.doesNotMatch(text, /import \{[^}]*\bcontainer\b[^}]*\} from '@repo\/core'/)`; `assert.doesNotMatch(text, /\bcontainer\b/)` | PASS |
| C8 | `app.ts` registers `createClientRoutes(clients)` and not `clientRoutes(app)` with no clients | carried from `871eefa9`; `✔ app.ts registers createClientRoutes with ClientsApi` | `scripts/phase-2-composition.test.mjs:109-110` - `assert.match(text, /createClientRoutes\(clients\)/)`; `assert.doesNotMatch(text, /register\(clientRoutes\)/)` | PASS |
| C9 | container keeps `'ClientRepository'` and drops seven use-case class registers | carried from `871eefa9`; `✔ container keeps ClientRepository token and drops client use-case class registers` | `scripts/phase-2-composition.test.mjs:125` - `assert.match(text, /container\.register\('ClientRepository'/)` `; `:127-129` - `assert.doesNotMatch(text, new RegExp(\`container\\.register\\(${name}[,\\s]\`))` for the 7 names | PASS |
| C10 | client application specs construct with `new GetClient(repo)` or sibling | carried from `871eefa9`; `✔ client application specs construct with new` | `scripts/phase-2-composition.test.mjs:149-151` - `assert.match(text, new RegExp(\`new ${className}\\(\`))` for GetClient, CreateClient, ListClients, UpdateClient, LgpdDeleteClient, ParseClientImport | PASS |
| C11 | v1 client route specs pass a fake `ClientsApi` and skip `mockResolve` / `container.resolve` | verified at `21ad389c`; `✔ client route specs pass fake ClientsApi and skip mockResolve` | `scripts/phase-2-composition.test.mjs:163-167` - `assert.match(text, /createFakeClientsApi\s*\()/`; `:168-172` - `assert.match(text, /,\s*clients\)/)`; `:173-182` - `assert.doesNotMatch(text, /\bmockResolve\b/)` and `assert.doesNotMatch(text, /container\.resolve/)` | PASS |
| C12 | `GetClient.execute` missing id throws `code` `CLIENT_NOT_FOUND` | carried from `871eefa9`; `✓ throws ClientNotFoundError when client does not exist` | `packages/core/src/modules/client/application/get-client.spec.ts:64` - `.rejects.toMatchObject({ code: 'CLIENT_NOT_FOUND' })` after `useCase.execute({ id: 'missing-id', organizationId: 'org-1' })` | PASS |
| C13 | eight OpenAPI `operationId`s stay on the same method and URL | carried from `871eefa9`; `✔ client operationIds stay on the same method and URL` | `scripts/phase-2-composition.test.mjs:210-223` - for each of 8 `OPERATION_IDS`: `assert.match(text, new RegExp(\`method:\\s*'${method}'\`))`; `assert.match(..., url)`; `assert.match(..., operationId)` | PASS |
| C14 | `compose.ts` given a `ClientRepository` returns a graph that includes `ClientsApi` | carried from `871eefa9`; `✓ composeServerClients returns ClientsApi from composeClients` | `apps/server/src/bootstrap/compose.spec.ts:34` - `expect(graph.clients.getClient.execute).toEqual(expect.any(Function))`; `:35-36` - `expect(Object.keys(graph.clients).sort()).toEqual([...REQUIRED_CLIENTS_API_KEYS].sort())` | PASS |
| C15 | `compose.spec.ts` registers `createClientRoutes` on Fastify without throwing | verified at `21ad389c`; `✓ createClientRoutes registers from composed graph` | `apps/server/src/bootstrap/compose.spec.ts:41` - `composeServerClients(fakeRepo())`; `:42` - `createTestApp(createClientRoutes(graph.clients))`; `:43-45` - `expect(app.hasRoute({ method: 'GET', url: '/api/v1/clients/:id' })).toBe(true)` | PASS |
| C16 | composed graph required keys include `deleteClient` | carried from `871eefa9`; `✓ composed graph requires deleteClient` | `apps/server/src/bootstrap/compose.spec.ts:50` - `expect(REQUIRED_CLIENTS_API_KEYS).toContain('deleteClient')`; `:52` - `expect(graph.clients.deleteClient).toBeDefined()` | PASS |
| C17 | composed graph required keys include `lgpdDeleteClient` | carried from `871eefa9`; `✓ composed graph requires lgpdDeleteClient` | `apps/server/src/bootstrap/compose.spec.ts:56` - `expect(REQUIRED_CLIENTS_API_KEYS).toContain('lgpdDeleteClient')`; `:58` - `expect(graph.clients.lgpdDeleteClient).toBeDefined()` | PASS |
| C18 | workspace `index.ts` does not export the three Prisma adapters | carried from `871eefa9`; `✔ workspace index does not export Prisma adapters` | `scripts/phase-2-composition.test.mjs:237-241` - `assert.doesNotMatch(text, new RegExp(\`export \\{ ${name} \\}\`))` for PrismaOrganizationRepository, PrismaMemberRepository, PrismaInvitationRepository | PASS |
| C19 | `PrismaMemberRepository` is not a named export of `@repo/core` | carried from `871eefa9`; `✓ PrismaMemberRepository is not exported from @repo/core` | `packages/core/src/modules/workspace/public-exports.spec.ts:6` - `expect('PrismaMemberRepository' in core).toBe(false)` (`import * as core from '../../index.js'`) | PASS |
| C20 | `exports['./workspace/infrastructure']` re-exports the three Prisma repos | carried from `871eefa9`; `✔ core exports workspace/infrastructure re-exports three Prisma repos` | `scripts/phase-2-composition.test.mjs:248` - `assert.ok(target, 'missing exports["./workspace/infrastructure"]')`; `:253-257` - `assert.match(barrel, new RegExp(\`export \\{ ${name} \\}\`))` for the three names | PASS |
| C21 | container-registrations imports the three Prisma names from the infrastructure subpath, not `@repo/core` | carried from `871eefa9`; `✔ container-registrations imports workspace Prisma from infrastructure subpath` | `scripts/phase-2-composition.test.mjs:263` - `assert.match(text, /from '@repo\/core\/workspace\/infrastructure'/)` `; `:267-272` - `assert.match(text, name)` and `assert.doesNotMatch(coreImport[1], \\b${name}\\b)` | PASS |
| C22 | `composeWorkspace` accepts the three repos plus collaborators and returns `getOrganization`, `listMembers`, `createInvitation` | carried from `871eefa9`; `✓ composeWorkspace returns getOrganization listMembers createInvitation` | `packages/core/src/modules/workspace/compose-workspace.spec.ts:23-26` - `composeWorkspace(fakeCollaborators())` then `expect(api.getOrganization.execute).toEqual(expect.any(Function))` (same for `listMembers`, `createInvitation`) | PASS |
| C23 | cruiser rule `no-core-infrastructure-from-apps` is `warn` with from/to/allowlist | carried from `871eefa9`; `✔ cruiser rule no-core-infrastructure-from-apps is warn with allowlist` | `scripts/phase-2-composition.test.mjs:278-283` - `assert.match(text, /name:\\s*'no-core-infrastructure-from-apps'/)`; `/severity:\\s*'warn'/`; `/apps\\/server\\/src/`; `/infrastructure/`; `/container-registrations/`; `/src\\/bootstrap\\//` | PASS |
| C24 | isolated canary route importing core infrastructure is reported by that rule | carried from `871eefa9`; `✔ canary reports no-core-infrastructure-from-apps` | `scripts/phase-2-composition.test.mjs:307` - `assert.match(output, /no-core-infrastructure-from-apps/, output)` after depcruise on the fixture tree | PASS |
| C25 | depcruise on `container-registrations.ts` does not report that rule | carried from `871eefa9`; `✔ container-registrations is allowlisted for workspace infrastructure` | `scripts/phase-2-composition.test.mjs:325` - `assert.doesNotMatch(output, /no-core-infrastructure-from-apps/, output)` | PASS |
| C26 | `forbidden-deps.md` names the allowlist and T6.1/T6.2 clear | carried from `871eefa9`; `✔ forbidden-deps documents infrastructure allowlist until T6` | `scripts/phase-2-composition.test.mjs:330-332` - `assert.match(text, /container-registrations\\.ts/)`; `assert.match(text, /bootstrap\\/)`; `assert.match(text, /T6\\.1\\/T6\\.2/)` | PASS |
| C27 | workspace v1 `GET /api/v1/members` returns 200 with a paginated list | carried from `871eefa9`; `✓ returns 200 with paginated member list` | `apps/server/src/routes/v1/members/__tests__/list-members.spec.ts:62` - `expect(response.statusCode).toBe(200)`; `:64-67` - `expect(body.success).toBe(true)`; `expect(body.data).toHaveLength(1)`; `expect(body.meta.total).toBe(1)` | PASS |
| C28 | `bens-ddd-module` names `composeClients` for `modules/client` and MUST NOT `@injectable` | carried from `871eefa9`; `✔ bens-ddd-module names composeClients for modules/client` | `scripts/phase-2-composition.test.mjs:337-339` - `assert.match(text, /composeClients/)`; `assert.match(text, /modules\\/client/)`; `assert.match(text, /MUST NOT use \`@injectable\\(\\)\`/)` | PASS |

## Coverage

n/a - profile light. The Coverage join was not recomputed from authority.

## Faults injected

n/a - profile light. Fault injection was not run because profile is light, so a missing Faults injected killed-mutant table is not a forgotten step.

## Swept existing

Carried from `871eefa9` except C11/C15 (no swept `existing` row). No `existing` row cites a missing constraint.

| Dimension | Check | Constraint in code | Present |
| --- | --- | --- | --- |
| authorization | existing | carried from `871eefa9` - `requireAbility` on every v1 client route: `get-client.ts:19` `requireAbility('read', 'Client')`; `list-clients.ts:18` `requireAbility('read', 'Client')`; `create-client.ts:20` `requireAbility('create', 'Client')`; `update-client.ts:25` `requireAbility('update', 'Client')`; `delete-client.ts:19` `requireAbility('delete', 'Client')`; `lgpd-delete-client.ts:22` `requireAbility('lgpd-delete', 'Client')`; `export-clients.ts:18` `requireAbility('read', 'Client')`; `import-clients.ts:34` `requireAbility('read', 'Client')` (upload/confirm/status use `manage`) | yes |
| validation | C1 | carried from `871eefa9` - `packages/core/src/modules/client/compose-clients.ts:11-19` `ClientsApi` keys; `:22-32` `composeClients` returns those eight `new` use cases | yes |
| validation | C13 | carried from `871eefa9` - frozen `operationId` + method + URL still on the route files, e.g. `get-client.ts:10-15` `GET` `/api/v1/clients/:id` `getClient`; `import-clients.ts:27-32` `GET` `/api/v1/clients/import/template` `importTemplateClients` | yes |
| failure modes | C12 | carried from `871eefa9` - `packages/core/src/modules/client/domain/client-errors.ts:2` `readonly code = 'CLIENT_NOT_FOUND'`; `application/get-client.ts:20-21` throws `ClientErrors.notFound` | yes |

n/a rows (idempotency, concurrency, data lifecycle, dependency failure, state transitions, observability) are policy the user approved; nothing in the code for them to be wrong about.

## Gate

`node --test --test-reporter spec scripts/phase-2-composition.test.mjs` - 18 passed, 0 failed

`pnpm --filter @repo/core exec vitest run src/modules/client/compose-clients.spec.ts src/modules/client/application/get-client.spec.ts src/modules/workspace/public-exports.spec.ts src/modules/workspace/compose-workspace.spec.ts --reporter=verbose` - 6 passed, 0 failed

`pnpm --filter @app/server exec vitest run src/bootstrap/compose.spec.ts src/routes/v1/members/__tests__/list-members.spec.ts --reporter=verbose` - 9 passed, 0 failed
