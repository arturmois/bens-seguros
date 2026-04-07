# P2-1: Server Integration Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add integration tests for all ~95 route handlers in apps/server, achieving ~300+ tests that verify Zod validation, handler wiring, and domain error mapping.

**Architecture:** Each test creates a lightweight Fastify instance via `createTestApp()`, registers only the route function under test (not the index plugin), and uses vi.mock for DI container, ability middleware, and audit logger. Auth/tenant context injected via onRequest hook. Real Zod validation and `handleDomainError` run. No database, no Redis.

**Tech Stack:** Vitest 3, Fastify 5 app.inject(), fastify-type-provider-zod, vi.mock

**Design spec:** `docs/superpowers/specs/2026-04-06-server-integration-tests-design.md`

---

## Handler Categories

Tests follow different patterns depending on how the handler accesses data:

| Category | Pattern                                   | Mock Strategy                                               | Examples                                                                                  |
| -------- | ----------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **A**    | `container.resolve(UseCase)`              | `mockResolve(mockExecute)`                                  | Most handlers                                                                             |
| **B**    | Direct `prisma` or `request.tenantPrisma` | `vi.mock('@repo/db')` or `setTestContext({ tenantPrisma })` | list-tenants, audit-logs, search, organization, members (list), invitations (list/public) |
| **C**    | File upload (`request.file()`)            | Mock multipart on inject                                    | upload-document, upload-logo                                                              |
| **D**    | External service (jwt, email, PDF)        | Mock service module                                         | create-chat-token, send-quote, generate-_-pdf, export-_                                   |

## Domain Error Code → HTTP Status Reference

```
400: INVITATION_EXPIRED, INVITATION_ALREADY_ACCEPTED
401: INVALID_CREDENTIALS
403: ROLE_HIERARCHY_VIOLATION
404: CLIENT_NOT_FOUND, PROPOSAL_NOT_FOUND, COMMISSION_NOT_FOUND, CLAIM_NOT_FOUND,
     POLICY_NOT_FOUND, INSURER_NOT_FOUND, DOCUMENT_NOT_FOUND, ENDORSEMENT_NOT_FOUND,
     ASSISTANCE_NOT_FOUND, OCCURRENCE_CLAIM_NOT_FOUND, NOTIFICATION_NOT_FOUND,
     MEMBER_NOT_FOUND, INVITATION_NOT_FOUND
409: CLIENT_ALREADY_EXISTS, INSURER_ALREADY_EXISTS, POLICY_ALREADY_CANCELLED,
     COMMISSION_ALREADY_PAID, DUPLICATE_POLICY, DUPLICATE_INVITATION, ALREADY_MEMBER
422: INVALID_STAGE_TRANSITION, INVALID_COMMISSION_TRANSITION,
     INVALID_CLAIM_STATUS_TRANSITION, INVALID_ASSISTANCE_STATUS_TRANSITION,
     COMMISSION_NOT_PAID, BRANCH_MISMATCH, PROPOSAL_DETAILS_REQUIRED,
     CHECKLIST_INCOMPLETE, POLICY_NOT_ISSUABLE, POLICY_MISSING_INSURER,
     SOURCE_POLICY_REQUIRED_FOR_ENDORSEMENT, SOURCE_POLICY_NOT_ELIGIBLE,
     CLIENT_NO_EMAIL, CANNOT_SEND_LOST_QUOTE, INVALID_COVERAGE_DATES,
     INVALID_FILE_TYPE, LAST_OWNER, SELF_REMOVAL
```

---

## Task 0: Test Infrastructure

**Files:**

- Create: `apps/server/src/__tests__/helpers/setup.ts`
- Create: `apps/server/src/__tests__/helpers/create-test-app.ts`
- Create: `apps/server/src/__tests__/helpers/mock-use-case.ts`
- Modify: `apps/server/vitest.config.ts`

- [ ] **Step 1: Create vitest setup file**

This file runs before every test. It mocks modules shared across ALL route tests.

```typescript
// apps/server/src/__tests__/helpers/setup.ts
import { vi } from 'vitest'

// Mock DI container — use cases are stubbed per test
vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return { ...mod, container: { resolve: vi.fn() } }
})

// Mock ability middleware — RBAC tested in packages/auth/abilities.spec.ts
vi.mock('../../middlewares/ability-middleware.js', () => ({
  requireAbility: () => async () => {},
}))

// Mock audit logger — fire-and-forget, not handler logic
vi.mock('../../services/audit-logger.js', () => ({
  auditCreate: vi.fn(),
  auditUpdate: vi.fn(),
  auditDelete: vi.fn(),
  auditApprove: vi.fn(),
  auditReject: vi.fn(),
}))
```

- [ ] **Step 2: Create test app factory**

```typescript
// apps/server/src/__tests__/helpers/create-test-app.ts
import Fastify, { type FastifyInstance } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'

export const TEST_ORG_ID = 'org-test-00000000-0000-0000-0000-000000000001'
export const TEST_USER_ID = 'user-test-00000000-0000-0000-0000-000000000001'
export const TEST_USER = {
  id: TEST_USER_ID,
  email: 'test@user.com',
  name: 'Test User',
  emailVerified: true,
  image: null,
  isSuperAdmin: false,
}

interface TestContext {
  organizationId: string
  user: typeof TEST_USER
  session: { activeOrganizationId: string }
  role: string
  tenantPrisma: unknown
}

const DEFAULT_CONTEXT: TestContext = {
  organizationId: TEST_ORG_ID,
  user: TEST_USER,
  session: { activeOrganizationId: TEST_ORG_ID },
  role: 'OWNER',
  tenantPrisma: {},
}

let _testContext: TestContext = { ...DEFAULT_CONTEXT }

export function setTestContext(overrides: Partial<TestContext> = {}) {
  _testContext = { ...DEFAULT_CONTEXT, ...overrides }
}

export async function createTestApp(
  registerRoutes: (app: FastifyInstance) => void | Promise<void>
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.decorateRequest('user', null)
  app.decorateRequest('session', null)
  app.decorateRequest('organizationId', null)
  app.decorateRequest('role', null)
  app.decorateRequest('tenantPrisma', null)

  app.addHook('onRequest', async (request) => {
    Object.assign(request, {
      user: _testContext.user,
      session: _testContext.session,
      organizationId: _testContext.organizationId,
      role: _testContext.role,
      tenantPrisma: _testContext.tenantPrisma,
    })
  })

  await registerRoutes(app)
  await app.ready()
  return app
}

export function injectAs(
  app: FastifyInstance,
  opts: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    url: string
    payload?: unknown
    query?: Record<string, string>
    headers?: Record<string, string>
  }
) {
  return app.inject({
    method: opts.method,
    url: opts.url,
    payload: opts.payload,
    query: opts.query,
    headers: {
      'content-type': 'application/json',
      ...opts.headers,
    },
  })
}
```

- [ ] **Step 3: Create mock use case helper**

```typescript
// apps/server/src/__tests__/helpers/mock-use-case.ts
import { container } from '@repo/core'

/**
 * Configure container.resolve: class tokens → mock use case, string tokens → null.
 * Covers handlers that also call container.resolve('CacheService').
 */
export function mockResolve(mockExecute: ReturnType<typeof vi.fn>) {
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') return { execute: mockExecute }
    return null
  })
}

/**
 * Configure container.resolve to reject with a domain error.
 */
export function mockResolveError(code: string, message = 'Test error') {
  const error = Object.assign(new Error(message), { code })
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') {
      return { execute: vi.fn().mockRejectedValue(error) }
    }
    return null
  })
}

/**
 * For handlers resolving multiple use cases. Mocks returned in order.
 */
export function mockResolveMultiple(mocks: ReturnType<typeof vi.fn>[]) {
  let i = 0
  vi.mocked(container.resolve).mockImplementation((token: unknown) => {
    if (typeof token === 'function') {
      const mock = mocks[i] ?? vi.fn().mockResolvedValue(null)
      i++
      return { execute: mock }
    }
    return null
  })
}
```

- [ ] **Step 4: Update vitest config**

Add the setup file to `apps/server/vitest.config.ts`:

```typescript
// apps/server/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/__tests__/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
    },
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      MONGODB_URL: 'mongodb://localhost:27017/test',
      AUTH_SECRET: 'test-auth-secret-at-least-32-chars!!',
      SOCKET_JWT_SECRET: 'test-socket-secret-16',
      ENCRYPTION_KEY: 'a'.repeat(64),
    },
  },
})
```

- [ ] **Step 5: Verify existing tests still pass**

Run: `pnpm --filter @app/server exec vitest run --reporter=verbose`
Expected: 3 existing tests pass (uploads-path-traversal, tenant-middleware, internal-auth-middleware)

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/__tests__/helpers/ apps/server/vitest.config.ts
git commit -m "test: add route test infrastructure (createTestApp, mockResolve, setup)"
```

---

## Task 1: Insurers Tests (Category A exemplar — 3 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/insurers/__tests__/create-insurer.spec.ts`
- Create: `apps/server/src/routes/v1/insurers/__tests__/list-insurers.spec.ts`
- Create: `apps/server/src/routes/v1/insurers/__tests__/update-insurer.spec.ts`

This task establishes the **standard pattern for Category A handlers** (container.resolve-based). All subsequent Category A tests follow this exact structure.

- [ ] **Step 1: Write create-insurer test**

```typescript
// apps/server/src/routes/v1/insurers/__tests__/create-insurer.spec.ts
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { createInsurerRoute } from '../create-insurer.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(createInsurerRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('POST /api/v1/insurers', () => {
  const validPayload = { name: 'Test Insurer' }
  const mockInsurer = {
    id: 'ins-1',
    organizationId: TEST_ORG_ID,
    name: 'Test Insurer',
    code: null,
    active: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }

  it('returns 201 with insurer data', async () => {
    mockExecute.mockResolvedValue(mockInsurer)
    const res = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/insurers',
      payload: validPayload,
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().success).toBe(true)
    expect(res.json().data.id).toBe('ins-1')
  })

  it('passes organizationId to use case', async () => {
    mockExecute.mockResolvedValue(mockInsurer)
    await injectAs(app, {
      method: 'POST',
      url: '/api/v1/insurers',
      payload: validPayload,
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: TEST_ORG_ID,
        name: 'Test Insurer',
      })
    )
  })

  it('returns 400 when name is missing', async () => {
    const res = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/insurers',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 409 when insurer already exists', async () => {
    mockResolveError('INSURER_ALREADY_EXISTS')
    const res = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/insurers',
      payload: validPayload,
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('INSURER_ALREADY_EXISTS')
  })
})
```

- [ ] **Step 2: Write list-insurers test**

```typescript
// apps/server/src/routes/v1/insurers/__tests__/list-insurers.spec.ts
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { mockResolve } from '../../../../__tests__/helpers/mock-use-case.js'
import { listInsurersRoute } from '../list-insurers.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listInsurersRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('GET /api/v1/insurers', () => {
  const mockResult = {
    items: [
      {
        id: 'ins-1',
        organizationId: TEST_ORG_ID,
        name: 'Insurer A',
        code: null,
        active: true,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
    ],
    nextCursor: null,
  }

  it('returns 200 with insurer list', async () => {
    mockExecute.mockResolvedValue(mockResult)
    const res = await injectAs(app, { method: 'GET', url: '/api/v1/insurers' })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
    expect(res.json().data).toHaveLength(1)
    expect(res.json().meta.nextCursor).toBeNull()
  })

  it('passes query filters to use case', async () => {
    mockExecute.mockResolvedValue({ items: [], nextCursor: null })
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/insurers?active=true&search=test&limit=50',
    })
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ active: true, search: 'test' }),
      expect.objectContaining({ limit: 50 })
    )
  })
})
```

- [ ] **Step 3: Write update-insurer test**

```typescript
// apps/server/src/routes/v1/insurers/__tests__/update-insurer.spec.ts
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import {
  mockResolve,
  mockResolveError,
} from '../../../../__tests__/helpers/mock-use-case.js'
import { updateInsurerRoute } from '../update-insurer.js'

const mockExecute = vi.fn()
let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(updateInsurerRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
  mockResolve(mockExecute)
})

describe('PUT /api/v1/insurers/:id', () => {
  const validPayload = { name: 'Updated', active: true }
  const mockInsurer = {
    id: 'ins-1',
    organizationId: TEST_ORG_ID,
    name: 'Updated',
    code: null,
    active: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }

  it('returns 200 with updated insurer', async () => {
    mockExecute.mockResolvedValue(mockInsurer)
    const res = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/insurers/ins-1',
      payload: validPayload,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.name).toBe('Updated')
  })

  it('returns 400 when body is invalid', async () => {
    const res = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/insurers/ins-1',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when insurer not found', async () => {
    mockResolveError('INSURER_NOT_FOUND')
    const res = await injectAs(app, {
      method: 'PUT',
      url: '/api/v1/insurers/ins-1',
      payload: validPayload,
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('INSURER_NOT_FOUND')
  })
})
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/insurers/__tests__/ --reporter=verbose`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/v1/insurers/__tests__/
git commit -m "test: add insurer route handler tests"
```

---

## Task 2: Tenants + Audit Logs + Search + Chat Tests (Category B/D exemplars — 4 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/tenants/__tests__/list-tenants.spec.ts`
- Create: `apps/server/src/routes/v1/audit-logs/__tests__/list-audit-logs.spec.ts`
- Create: `apps/server/src/routes/v1/search/__tests__/global-search.spec.ts`
- Create: `apps/server/src/routes/v1/chat/__tests__/create-chat-token.spec.ts`

These handlers do NOT use `container.resolve(UseCase)`. They need different mock strategies.

- [ ] **Step 1: Write list-tenants test (Category B — direct prisma import)**

This handler imports `prisma` from `@repo/db` directly. Mock `@repo/db` in the test file.

```typescript
// apps/server/src/routes/v1/tenants/__tests__/list-tenants.spec.ts
vi.mock('@repo/db', () => ({
  prisma: {
    member: { findMany: vi.fn() },
  },
}))

import { prisma } from '@repo/db'
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_USER_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { listTenantsRoute } from '../list-tenants.js'

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listTenantsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

describe('GET /api/v1/tenants', () => {
  it('returns 200 with tenant list', async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      {
        role: 'OWNER',
        organization: { id: 'org-1', name: 'Org A', slug: 'org-a', logo: null },
      },
    ] as any)
    const res = await injectAs(app, { method: 'GET', url: '/api/v1/tenants' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(1)
    expect(res.json().data[0].role).toBe('OWNER')
  })

  it('queries by authenticated user id', async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([])
    await injectAs(app, { method: 'GET', url: '/api/v1/tenants' })
    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER_ID, active: true },
      })
    )
  })
})
```

- [ ] **Step 2: Write list-audit-logs test (Category B — direct prisma import)**

```typescript
// apps/server/src/routes/v1/audit-logs/__tests__/list-audit-logs.spec.ts
vi.mock('@repo/db', () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@repo/db'
import {
  createTestApp,
  injectAs,
  setTestContext,
  TEST_ORG_ID,
} from '../../../../__tests__/helpers/create-test-app.js'
import { listAuditLogsRoute } from '../list-audit-logs.js'

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(listAuditLogsRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

describe('GET /api/v1/audit-logs', () => {
  it('returns 200 with paginated audit logs', async () => {
    const mockLog = {
      id: 'log-1',
      organizationId: TEST_ORG_ID,
      userId: 'u-1',
      action: 'CREATE',
      entityType: 'Client',
      entityId: 'c-1',
      before: null,
      after: {},
      ipAddress: '127.0.0.1',
      userAgent: 'test',
      createdAt: new Date('2025-01-01'),
    }
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLog] as any)
    vi.mocked(prisma.auditLog.count).mockResolvedValue(1)

    const res = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs',
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(1)
    expect(res.json().meta.total).toBe(1)
  })

  it('passes filters to prisma query', async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([])
    vi.mocked(prisma.auditLog.count).mockResolvedValue(0)
    await injectAs(app, {
      method: 'GET',
      url: '/api/v1/audit-logs?entityType=Client&action=CREATE',
    })
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: TEST_ORG_ID,
          entityType: 'Client',
          action: 'CREATE',
        }),
      })
    )
  })
})
```

- [ ] **Step 3: Write global-search test (Category B — uses tenantPrisma)**

```typescript
// apps/server/src/routes/v1/search/__tests__/global-search.spec.ts
import {
  createTestApp,
  injectAs,
  setTestContext,
} from '../../../../__tests__/helpers/create-test-app.js'
import { globalSearchRoute } from '../global-search.js'

const mockFindMany = vi.fn().mockResolvedValue([])
const mockTenantPrisma = {
  client: { findMany: mockFindMany },
  proposal: { findMany: vi.fn().mockResolvedValue([]) },
  policy: { findMany: vi.fn().mockResolvedValue([]) },
  claim: { findMany: vi.fn().mockResolvedValue([]) },
}

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(globalSearchRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext({ tenantPrisma: mockTenantPrisma })
})

describe('GET /api/v1/search', () => {
  it('returns 200 with search results', async () => {
    const res = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/search?q=test',
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveProperty('clients')
    expect(res.json().data).toHaveProperty('proposals')
    expect(res.json().data).toHaveProperty('policies')
    expect(res.json().data).toHaveProperty('claims')
  })

  it('returns 400 when q is missing', async () => {
    const res = await injectAs(app, {
      method: 'GET',
      url: '/api/v1/search',
    })
    expect(res.statusCode).toBe(400)
  })
})
```

- [ ] **Step 4: Write create-chat-token test (Category D — jwt.sign)**

```typescript
// apps/server/src/routes/v1/chat/__tests__/create-chat-token.spec.ts
import {
  createTestApp,
  injectAs,
  setTestContext,
} from '../../../../__tests__/helpers/create-test-app.js'
import { createChatTokenRoute } from '../create-chat-token.js'

let app: Awaited<ReturnType<typeof createTestApp>>

beforeAll(async () => {
  app = await createTestApp(createChatTokenRoute)
})
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  setTestContext()
})

describe('POST /api/v1/chat/token', () => {
  it('returns 200 with JWT token', async () => {
    const res = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/chat/token',
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
    expect(res.json().data.token).toEqual(expect.any(String))
  })

  it('returns 401 when user context is incomplete', async () => {
    setTestContext({
      user: {
        id: '',
        name: '',
        email: '',
        emailVerified: false,
        image: null,
        isSuperAdmin: false,
      } as any,
    })
    const res = await injectAs(app, {
      method: 'POST',
      url: '/api/v1/chat/token',
    })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/tenants/__tests__/ src/routes/v1/audit-logs/__tests__/ src/routes/v1/search/__tests__/ src/routes/v1/chat/__tests__/ --reporter=verbose`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/routes/v1/tenants/__tests__/ apps/server/src/routes/v1/audit-logs/__tests__/ apps/server/src/routes/v1/search/__tests__/ apps/server/src/routes/v1/chat/__tests__/
git commit -m "test: add tenants, audit-logs, search, chat route tests"
```

---

## Task 3: Notifications Tests (5 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/notifications/__tests__/list-notifications.spec.ts`
- Create: `apps/server/src/routes/v1/notifications/__tests__/mark-as-read.spec.ts`
- Create: `apps/server/src/routes/v1/notifications/__tests__/mark-all-as-read.spec.ts`
- Create: `apps/server/src/routes/v1/notifications/__tests__/get-unread-count.spec.ts`
- Create: `apps/server/src/routes/v1/notifications/__tests__/get-alert-counts.spec.ts`

All Category A handlers.

- [ ] **Step 1: Write all notification test files**

Read each handler source file, then create the test following Task 1's pattern. Handler-specific details:

**list-notifications:**

- Route: `GET /api/v1/notifications`
- Use Case: `ListNotifications`
- Mock return: `{ items: [{ id, organizationId, userId, type, title, body, entityType, entityId, read, readAt, emailSent, createdAt }], nextCursor: null }`
- Query params: `?read=true&limit=10`
- No error cases (read-only)

**mark-as-read:**

- Route: `POST /api/v1/notifications/:id/read`
- Use Case: `MarkNotificationAsRead`
- Mock return: `null` (response schema is null data)
- Error: `NOTIFICATION_NOT_FOUND` → 404

**mark-all-as-read:**

- Route: `POST /api/v1/notifications/read-all`
- Use Case: `MarkAllNotificationsAsRead`
- Mock return: `{ count: 5 }`
- No error cases

**get-unread-count:**

- Route: `GET /api/v1/notifications/unread-count`
- Use Case: `CountUnreadNotifications`
- Mock return: `{ count: 3 }`
- No error cases

**get-alert-counts:**

- Route: `GET /api/v1/notifications/alert-counts`
- Use Case: `CountAlertsByEntityType`
- Mock return: `{ Proposal: 2, Policy: 1 }` (Record<string, number>)
- No error cases

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/notifications/__tests__/ --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/notifications/__tests__/
git commit -m "test: add notification route handler tests"
```

---

## Task 4: Terms Tests (2 handlers)

**Files:**

- Create: `apps/server/src/routes/terms/__tests__/accept-terms.spec.ts`
- Create: `apps/server/src/routes/terms/__tests__/get-terms-status.spec.ts`

Category B — direct prisma access with Better Auth user model.

- [ ] **Step 1: Write test files**

Read each handler source (`apps/server/src/routes/terms/accept-terms.ts`, `get-terms-status.ts`). Both import `prisma` from `@repo/db` and access `request.user` directly.

Mock `@repo/db` prisma in each test file (like Task 2 list-tenants pattern). The handler reads/writes user records via `prisma.user.update()`, `prisma.user.findUnique()`, `prisma.termsAcceptance.create()`.

**accept-terms:**

- Route: `POST /api/terms/accept`
- Body: `{ termsVersion, privacyVersion }`
- Mock: `prisma.user.update` → returns user with updated termsVersion
- Test: 200 on valid versions, 409 if version mismatch with CURRENT\_\*\_VERSION

**get-terms-status:**

- Route: `GET /api/terms/status`
- Mock: `prisma.user.findUnique` → returns user with termsVersion/privacyVersion
- Test: 200 with needsReAccept boolean

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/terms/__tests__/ --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/terms/__tests__/
git commit -m "test: add terms route handler tests"
```

---

## Task 5: Organization + Members Tests (6 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/organization/__tests__/get-organization.spec.ts`
- Create: `apps/server/src/routes/v1/organization/__tests__/update-organization.spec.ts`
- Create: `apps/server/src/routes/v1/organization/__tests__/upload-logo.spec.ts`
- Create: `apps/server/src/routes/v1/members/__tests__/list-members.spec.ts`
- Create: `apps/server/src/routes/v1/members/__tests__/delete-member.spec.ts`
- Create: `apps/server/src/routes/v1/members/__tests__/update-member-role.spec.ts`

Mixed categories: organization routes use direct prisma + StorageProvider (Category B/C), member routes use use cases + direct prisma (mixed A/B).

- [ ] **Step 1: Write organization test files**

Read each handler source. Organization handlers import `prisma` from `@repo/db` and resolve `StorageProvider` and `CacheService` from the DI container.

**get-organization:**

- Route: `GET /api/v1/organization`
- Category B: direct prisma + container.resolve('CacheService') + container.resolve('StorageProvider')
- Mock prisma.organization.findUnique → org data
- container.resolve returns null for CacheService, mock StorageProvider for logo URL
- Test: 200 with org details, 404 if not found

**update-organization:**

- Route: `PUT /api/v1/organization`
- Body: `{ name: "New Name", slug: "new-slug" }`
- Category B: direct prisma
- Mock prisma.organization.findFirst (slug check) + prisma.organization.update
- Test: 200 on update, 409 if slug conflict, 400 if body invalid

**upload-logo:**

- Route: `PUT /api/v1/organization/logo`
- Category C: multipart file upload
- The handler calls `request.file()` — for app.inject(), use form-data or mock. Register `@fastify/multipart` on test app if needed.
- Test: 200 on valid image upload, 400 if no file, 400 if invalid MIME

**list-members:**

- Route: `GET /api/v1/members`
- Category B: direct prisma (request.tenantPrisma or global prisma)
- Read the source to determine which prisma is used and mock accordingly

**delete-member:**

- Route: `DELETE /api/v1/members/:id`
- Category A: `container.resolve(DeactivateMember)`
- Error: `MEMBER_NOT_FOUND` → 404, `LAST_OWNER` → 422, `SELF_REMOVAL` → 422

**update-member-role:**

- Route: `PUT /api/v1/members/:id/role`
- Body: `{ role: "ADMIN" }`
- Category A: `container.resolve(UpdateMemberRole)`
- Error: `MEMBER_NOT_FOUND` → 404, `ROLE_HIERARCHY_VIOLATION` → 403

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/organization/__tests__/ src/routes/v1/members/__tests__/ --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/organization/__tests__/ apps/server/src/routes/v1/members/__tests__/
git commit -m "test: add organization and member route handler tests"
```

---

## Task 6: Invitations Tests (5 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/invitations/__tests__/list-invitations.spec.ts`
- Create: `apps/server/src/routes/v1/invitations/__tests__/create-invitation.spec.ts`
- Create: `apps/server/src/routes/v1/invitations/__tests__/delete-invitation.spec.ts`
- Create: `apps/server/src/routes/v1/invitations/__tests__/get-public-invitation.spec.ts`
- Create: `apps/server/src/routes/v1/invitations/__tests__/accept-invitation.spec.ts`

Mixed categories. Public routes (get-public, accept) don't require auth context.

- [ ] **Step 1: Write test files**

Read each handler source. Key details:

**list-invitations:**

- Route: `GET /api/v1/invitations`
- Category B: direct prisma with tenantPrisma or global prisma
- Mock the findMany call

**create-invitation:**

- Route: `POST /api/v1/invitations`
- Body: `{ email: "new@test.com", role: "ADMIN" }`
- Category B+D: direct prisma checks + email sending
- Mock prisma.member.findFirst (duplicate check), prisma.invitation.findFirst, prisma.invitation.create
- Also mock the email provider module
- Error: `DUPLICATE_INVITATION` → 409, `ALREADY_MEMBER` → 409, `ROLE_HIERARCHY_VIOLATION` → 403

**delete-invitation:**

- Route: `DELETE /api/v1/invitations/:id`
- Category B: direct prisma
- Error: `INVITATION_NOT_FOUND` → 404

**get-public-invitation (UNAUTHENTICATED):**

- Route: `GET /api/v1/invitations/:id/public`
- Category B: uses global `prisma` (NOT tenantPrisma)
- Mock `@repo/db` prisma directly
- No auth context needed — set user to null or test without auth
- Test: 200 with public fields, 404 if not found

**accept-invitation (UNAUTHENTICATED, COMPLEX):**

- Route: `POST /api/v1/invitations/:id/accept`
- Body: discriminated union `{ mode: "register", name, password }` or `{ mode: "login", password }`
- Category B+D: prisma + Better Auth API calls + AcceptInvitation use case
- This handler is the most complex. Mock: prisma queries, auth API calls (signUpEmail, signInEmail), container.resolve(AcceptInvitation)
- Test: 200 on accept, 404 if not found, 400 if body invalid

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/invitations/__tests__/ --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/invitations/__tests__/
git commit -m "test: add invitation route handler tests"
```

---

## Task 7: Documents + Endorsements + Assistances Tests (11 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/documents/__tests__/upload-document.spec.ts`
- Create: `apps/server/src/routes/v1/documents/__tests__/list-documents.spec.ts`
- Create: `apps/server/src/routes/v1/documents/__tests__/get-document-url.spec.ts`
- Create: `apps/server/src/routes/v1/documents/__tests__/delete-document.spec.ts`
- Create: `apps/server/src/routes/v1/endorsements/__tests__/create-endorsement.spec.ts`
- Create: `apps/server/src/routes/v1/endorsements/__tests__/list-endorsements.spec.ts`
- Create: `apps/server/src/routes/v1/endorsements/__tests__/get-endorsement.spec.ts`
- Create: `apps/server/src/routes/v1/assistances/__tests__/create-assistance.spec.ts`
- Create: `apps/server/src/routes/v1/assistances/__tests__/list-assistances.spec.ts`
- Create: `apps/server/src/routes/v1/assistances/__tests__/get-assistance.spec.ts`
- Create: `apps/server/src/routes/v1/assistances/__tests__/update-assistance-status.spec.ts`

All Category A except upload-document (Category C — multipart).

- [ ] **Step 1: Write document test files**

**upload-document (Category C):**

- Route: `POST /api/v1/documents/upload`
- Uses `request.file()` for multipart upload
- Need `@fastify/multipart` registered on test app, or mock the file() method
- Mock: container.resolve(UploadDocument) with mockResolve
- Test: 201 on valid file, 400 if no file

**list-documents:**

- Route: `GET /api/v1/documents`
- Use Case: `ListDocuments`
- Query: `?entityType=CLIENT&entityId=c-1`
- Returns array (no pagination)

**get-document-url:**

- Route: `GET /api/v1/documents/:id/url`
- Use Case: `GetDocumentUrl`
- Mock return: `{ url: "https://example.com/signed" }`
- Error: `DOCUMENT_NOT_FOUND` → 404

**delete-document:**

- Route: `DELETE /api/v1/documents/:id`
- Use Case: `DeleteDocument`
- Returns 204

- [ ] **Step 2: Write endorsement test files**

All Category A, standard pattern.

**create-endorsement:**

- Route: `POST /api/v1/endorsements`
- Use Case: `CreateEndorsement`
- Body: `{ policyId, type, description, effectiveDate }`
- Error: `ENDORSEMENT_NOT_FOUND` → 404

**list-endorsements:**

- Route: `GET /api/v1/endorsements`
- Use Case: `ListEndorsements`
- Query: `?policyId=pol-1&limit=20`

**get-endorsement:**

- Route: `GET /api/v1/endorsements/:id`
- Use Case: `GetEndorsement`
- Error: `ENDORSEMENT_NOT_FOUND` → 404

- [ ] **Step 3: Write assistance test files**

All Category A, standard pattern.

**create-assistance:**

- Route: `POST /api/v1/assistances`
- Use Case: `CreateAssistance`
- Body: `{ policyId, clientId, type, description }`

**list-assistances:**

- Route: `GET /api/v1/assistances`
- Use Case: `ListAssistances`
- Query: `?status=REQUESTED&policyId=pol-1`

**get-assistance:**

- Route: `GET /api/v1/assistances/:id`
- Use Case: `GetAssistance`
- Error: `ASSISTANCE_NOT_FOUND` → 404

**update-assistance-status:**

- Route: `POST /api/v1/assistances/:id/status`
- Use Case: `UpdateAssistanceStatus`
- Body: `{ status: "COMPLETED" }`
- Error: `INVALID_ASSISTANCE_STATUS_TRANSITION` → 422

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/documents/__tests__/ src/routes/v1/endorsements/__tests__/ src/routes/v1/assistances/__tests__/ --reporter=verbose`

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/v1/documents/__tests__/ apps/server/src/routes/v1/endorsements/__tests__/ apps/server/src/routes/v1/assistances/__tests__/
git commit -m "test: add documents, endorsements, assistances route handler tests"
```

---

## Task 8: Clients Tests (9 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/clients/__tests__/create-client.spec.ts`
- Create: `apps/server/src/routes/v1/clients/__tests__/list-clients.spec.ts`
- Create: `apps/server/src/routes/v1/clients/__tests__/get-client.spec.ts`
- Create: `apps/server/src/routes/v1/clients/__tests__/update-client.spec.ts`
- Create: `apps/server/src/routes/v1/clients/__tests__/delete-client.spec.ts`
- Create: `apps/server/src/routes/v1/clients/__tests__/export-clients.spec.ts`
- Create: `apps/server/src/routes/v1/clients/__tests__/import-clients.spec.ts`

CRUD handlers are Category A. Export is Category D (CSV streaming). Import has 4 sub-routes.

- [ ] **Step 1: Write CRUD test files**

**create-client:**

- Route: `POST /api/v1/clients`
- Use Case: `CreateClient`
- Body: `{ name: "Test Client", document: "12345678901", personType: "INDIVIDUAL" }`
- Uses `ClientPresenter.toDetail()` — mock return must match the response schema OR mock the Presenter via `@repo/core` override
- Error: `CLIENT_ALREADY_EXISTS` → 409
- Special: when role=COMMERCIAL, passes `salespersonId = request.user.id` — test with `setTestContext({ role: 'COMMERCIAL' })`
- Invalid body: `{ document: "12345678901234" }` with personType=INDIVIDUAL triggers refinement (CPF must be 11 digits) → 400

**list-clients:**

- Route: `GET /api/v1/clients`
- Use Case: `ListClients`
- Uses `ClientPresenter.toList()`
- Query: `?type=CLIENT&search=test`

**get-client:**

- Route: `GET /api/v1/clients/:id`
- Use Case: `GetClient`
- Uses `ClientPresenter.toDetail()`
- Error: `CLIENT_NOT_FOUND` → 404

**update-client:**

- Route: `PUT /api/v1/clients/:id`
- Use Case: `UpdateClient`
- Body: partial (no document/personType)
- Error: `CLIENT_NOT_FOUND` → 404

**delete-client:**

- Route: `DELETE /api/v1/clients/:id`
- Use Case: `DeleteClient`
- Returns 204
- Error: `CLIENT_NOT_FOUND` → 404

**NOTE on ClientPresenter:** If the real ClientPresenter from `@repo/core` transforms the mock data correctly (just maps properties), no extra mocking is needed. If it throws on missing domain-entity methods, override it in the test file:

```typescript
vi.mock('@repo/core', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@repo/core')>()
  return {
    ...mod,
    container: { resolve: vi.fn() },
    ClientPresenter: {
      toDetail: vi.fn((data: any) => data),
      toList: vi.fn((data: any) => data),
    },
  }
})
```

- [ ] **Step 2: Write export-clients test**

**export-clients (Category D — CSV streaming):**

- Route: `GET /api/v1/clients/export`
- Use Case: `ExportClientsCsv` — returns an async generator
- Mock: `mockExecute.mockReturnValue(asyncGenerator)` where generator yields CSV lines
- Test: 200 with `content-type: text/csv` header, `content-disposition` with filename

- [ ] **Step 3: Write import-clients test**

**import-clients (multi-route file, Category C/D):**

- 4 routes in one file. Register all via `importClientsRoutes(app)`.
- Template: `GET /api/v1/clients/import/template` — returns CSV string
- Upload: `POST /api/v1/clients/import` — multipart file, resolves ParseClientImport
- Confirm: `POST /api/v1/clients/import/:jobId/confirm` — resolves staged data
- Status: `GET /api/v1/clients/import/:jobId/status` — reads job state
- Mock: import staging services, ParseClientImport use case

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/clients/__tests__/ --reporter=verbose`

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/v1/clients/__tests__/
git commit -m "test: add client route handler tests"
```

---

## Task 9: Claims Tests (7 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/claims/__tests__/create-claim.spec.ts`
- Create: `apps/server/src/routes/v1/claims/__tests__/list-claims.spec.ts`
- Create: `apps/server/src/routes/v1/claims/__tests__/get-claim.spec.ts`
- Create: `apps/server/src/routes/v1/claims/__tests__/delete-claim.spec.ts`
- Create: `apps/server/src/routes/v1/claims/__tests__/update-claim-status.spec.ts`
- Create: `apps/server/src/routes/v1/claims/__tests__/create-occurrence.spec.ts`
- Create: `apps/server/src/routes/v1/claims/__tests__/list-occurrences.spec.ts`

Mostly Category A. create-claim also has notification side effects (Category D).

- [ ] **Step 1: Write test files**

**create-claim:**

- Route: `POST /api/v1/claims`
- Use Case: `CreateClaim`
- Body: `{ policyId, clientId, priority: "NORMAL", description: "Test", estimatedValueInCents: 50000, incidentDate: "2025-01-01" }`
- Also uses tenantPrisma for manager notification queries — mock those or let them return empty
- Mock notification enqueue module
- Error: `CLAIM_NOT_FOUND` → 404 (unlikely on create, but handler uses handleDomainError)

**list-claims:**

- Route: `GET /api/v1/claims`
- Use Case: `ListClaims`
- Query: `?status=REGISTERED&priority=HIGH&limit=20`

**get-claim:**

- Route: `GET /api/v1/claims/:id`
- Use Case: `GetClaim`
- Error: `CLAIM_NOT_FOUND` → 404

**delete-claim:**

- Route: `DELETE /api/v1/claims/:id`
- Use Case: `DeleteClaim`
- Returns 204

**update-claim-status:**

- Route: `POST /api/v1/claims/:id/status`
- Use Case: `UpdateClaimStatus`
- Body: `{ status: "IN_ANALYSIS" }`
- Error: `INVALID_CLAIM_STATUS_TRANSITION` → 422

**create-occurrence:**

- Route: `POST /api/v1/claims/:id/occurrences`
- Use Case: `CreateOccurrence`
- Body: `{ type: "NOTE", description: "Test note" }`
- Uses `request.user.id` as createdBy

**list-occurrences:**

- Route: `GET /api/v1/claims/:id/occurrences`
- Use Case: `ListOccurrences`
- Returns array (no pagination)

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/claims/__tests__/ --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/claims/__tests__/
git commit -m "test: add claim route handler tests"
```

---

## Task 10: Policies Tests (10 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/policies/__tests__/issue-policy.spec.ts`
- Create: `apps/server/src/routes/v1/policies/__tests__/list-policies.spec.ts`
- Create: `apps/server/src/routes/v1/policies/__tests__/get-policy.spec.ts`
- Create: `apps/server/src/routes/v1/policies/__tests__/cancel-policy.spec.ts`
- Create: `apps/server/src/routes/v1/policies/__tests__/export-policies.spec.ts`
- Create: `apps/server/src/routes/v1/policies/__tests__/import-policies.spec.ts`
- Create: `apps/server/src/routes/v1/policies/__tests__/generate-policy-pdf.spec.ts`

- [ ] **Step 1: Write CRUD test files**

**issue-policy:**

- Route: `POST /api/v1/policies`
- Use Case: `IssuePolicy`
- Body: `{ proposalId, policyNumber, startDate, endDate }`
- Has PDF generation side effect — mock PDF modules
- Error: `POLICY_NOT_ISSUABLE` → 422, `POLICY_MISSING_INSURER` → 422, `DUPLICATE_POLICY` → 409

**list-policies:**

- Route: `GET /api/v1/policies`
- Use Case: `ListPolicies`
- Query: `?status=ACTIVE&branch=AUTO`

**get-policy:**

- Route: `GET /api/v1/policies/:id`
- Use Case: `GetPolicy`
- Error: `POLICY_NOT_FOUND` → 404

**cancel-policy:**

- Route: `POST /api/v1/policies/:id/cancel`
- Use Case: `CancelPolicy`
- Body: `{ reason: "Client requested" }`
- Error: `POLICY_NOT_FOUND` → 404, `POLICY_ALREADY_CANCELLED` → 409

- [ ] **Step 2: Write export/import/PDF test files**

**export-policies** — same CSV streaming pattern as export-clients.

**import-policies** — same 4-route pattern as import-clients. Mock staging + job services.

**generate-policy-pdf** — Route: `POST /api/v1/policies/:id/pdf`. Complex handler with caching, decryption, PDF rendering. Mock storage, PDF renderer, document repo. Test: 200 with `{ url, cached }`.

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/policies/__tests__/ --reporter=verbose`

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/v1/policies/__tests__/
git commit -m "test: add policy route handler tests"
```

---

## Task 11: Proposals Tests (12 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/proposals/__tests__/create-proposal.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/list-proposals.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/get-proposal.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/update-proposal-details.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/update-proposal-dates.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/send-quote.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/advance-proposal.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/mark-proposal-lost.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/reopen-proposal.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/generate-proposal-pdf.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/export-proposals.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/get-proposal-checklist.spec.ts`
- Create: `apps/server/src/routes/v1/proposals/__tests__/complete-checklist-item.spec.ts`

Most complex domain. Use cases return domain entities with `.toJSON()` method — mock return must include `toJSON()`.

- [ ] **Step 1: Write CRUD + state transition test files**

**create-proposal:**

- Route: `POST /api/v1/proposals`
- Use Case: `CreateProposal`
- Body: discriminated union by boardType. Test `{ boardType: "NEW_INSURANCE", clientId, branch: "AUTO" }`
- Mock return: `{ id: 'p-1', toJSON: () => ({ id: 'p-1', stage: 'QUOTATION', ... }) }`

**list-proposals:**

- Route: `GET /api/v1/proposals`
- Use Case: `ListProposals`
- Items use `.toJSON()` in map

**get-proposal:**

- Route: `GET /api/v1/proposals/:id`
- Use Case: `GetProposal`
- Error: `PROPOSAL_NOT_FOUND` → 404

**update-proposal-details:**

- Route: `PUT /api/v1/proposals/:id/details`
- Use Case: `UpdateProposalDetails`
- Body: discriminated by branch (insuredObjectDetails)

**update-proposal-dates:**

- Route: `PATCH /api/v1/proposals/:id/dates`
- Use Case: `UpdateProposalDates`
- Body: `{ coverageStartDate, coverageEndDate }`
- Error: `INVALID_COVERAGE_DATES` → 422

**advance-proposal:**

- Route: `POST /api/v1/proposals/:id/advance`
- Use Case: `AdvanceProposalStage`
- Mock return must include `.toJSON()` and `.stage`
- Error: `INVALID_STAGE_TRANSITION` → 422, `CHECKLIST_INCOMPLETE` → 422

**mark-proposal-lost:**

- Route: `POST /api/v1/proposals/:id/lost`
- Use Case: `MarkProposalLost`
- Body: `{ reason: "Client chose competitor" }`

**reopen-proposal:**

- Route: `POST /api/v1/proposals/:id/reopen`
- Use Case: `ReopenProposal`
- Returns null data

- [ ] **Step 2: Write send-quote + PDF + export + checklist tests**

**send-quote (multi use case):**

- Route: `POST /api/v1/proposals/:id/send-quote`
- Uses `mockResolveMultiple([getProposalMock, sendQuoteMock])`
- Also resolves StorageProvider and DocumentRepository
- Mock PDF rendering and email enqueue
- Returns 202

**generate-proposal-pdf:**

- Route: `POST /api/v1/proposals/:id/pdf`
- Similar to generate-policy-pdf. Mock storage, PDF, documents.

**export-proposals:**

- Route: `GET /api/v1/proposals/export`
- CSV streaming pattern

**get-proposal-checklist:**

- Route: `GET /api/v1/proposals/:id/checklist`
- Use Case: `ListChecklistItems`

**complete-checklist-item:**

- Route: `POST /api/v1/proposals/:id/checklist/:itemId/complete`
- Use Case: `CompleteChecklistByAttachment`
- Params: `{ id, itemId }`

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/proposals/__tests__/ --reporter=verbose`

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/v1/proposals/__tests__/
git commit -m "test: add proposal route handler tests"
```

---

## Task 12: Commissions Tests (8 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/commissions/__tests__/list-commissions.spec.ts`
- Create: `apps/server/src/routes/v1/commissions/__tests__/get-commission.spec.ts`
- Create: `apps/server/src/routes/v1/commissions/__tests__/approve-admin.spec.ts`
- Create: `apps/server/src/routes/v1/commissions/__tests__/approve-commercial.spec.ts`
- Create: `apps/server/src/routes/v1/commissions/__tests__/pay-commission.spec.ts`
- Create: `apps/server/src/routes/v1/commissions/__tests__/reject-commission.spec.ts`
- Create: `apps/server/src/routes/v1/commissions/__tests__/reverse-commission.spec.ts`
- Create: `apps/server/src/routes/v1/commissions/__tests__/export-commissions.spec.ts`

Category A for most. approve-admin and reject have notification side effects (Category D).

- [ ] **Step 1: Write test files**

**list-commissions:**

- Route: `GET /api/v1/commissions`
- Use Case: `ListCommissions`
- Query: `?status=PENDING_ADMIN&dateFrom=2025-01-01`

**get-commission:**

- Route: `GET /api/v1/commissions/:id`
- Use Case: `GetCommission`
- Error: `COMMISSION_NOT_FOUND` → 404

**approve-admin:**

- Route: `POST /api/v1/commissions/:id/approve-admin`
- Use Case: `ApproveCommissionAdmin`
- Mock notification enqueue module (fire-and-forget email to salesperson)
- Error: `INVALID_COMMISSION_TRANSITION` → 422

**approve-commercial:**

- Route: `POST /api/v1/commissions/:id/approve-commercial`
- Use Case: `ApproveCommissionCommercial`
- Error: `INVALID_COMMISSION_TRANSITION` → 422

**pay-commission:**

- Route: `POST /api/v1/commissions/:id/pay`
- Use Case: `PayCommission`
- Error: `COMMISSION_NOT_PAID` → 422, `INVALID_COMMISSION_TRANSITION` → 422

**reject-commission:**

- Route: `POST /api/v1/commissions/:id/reject`
- Use Case: `RejectCommission`
- Body: `{ reason: "Incorrect amount" }`
- Mock notification enqueue
- Error: `INVALID_COMMISSION_TRANSITION` → 422

**reverse-commission:**

- Route: `POST /api/v1/commissions/:id/reverse`
- Use Case: `ReverseCommission`
- Returns 201 with `{ reversal, original }` — two objects
- Error: `COMMISSION_ALREADY_PAID` → 409

**export-commissions:**

- Route: `GET /api/v1/commissions/export`
- CSV streaming pattern

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/commissions/__tests__/ --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/commissions/__tests__/
git commit -m "test: add commission route handler tests"
```

---

## Task 13: Internal Routes Tests (7 handlers)

**Files:**

- Create: `apps/server/src/routes/internal/leads/__tests__/create-lead.spec.ts`
- Create: `apps/server/src/routes/internal/leads/__tests__/list-proposals.spec.ts`
- Create: `apps/server/src/routes/internal/leads/__tests__/list-policies.spec.ts`
- Create: `apps/server/src/routes/internal/leads/__tests__/search-clients.spec.ts`
- Create: `apps/server/src/routes/internal/leads/__tests__/create-claim.spec.ts`
- Create: `apps/server/src/routes/internal/leads/__tests__/update-client.spec.ts`
- Create: `apps/server/src/routes/internal/leads/__tests__/update-proposal-details.spec.ts`

Category B — all use `createTenantClient()` for direct DB access. Internal routes use `internalAuthMiddleware` (HMAC-based).

- [ ] **Step 1: Write test files**

Internal routes import `createTenantClient` from `@repo/db`. Mock it in each test file:

```typescript
vi.mock('@repo/db', () => ({
  prisma: {
    /* global prisma mocks */
  },
  createTenantClient: vi.fn(() => mockTenantPrisma),
}))
```

The `internalAuthMiddleware` is registered in the internal index.ts. Since we import individual route functions (not the index), the HMAC middleware doesn't run. But these routes also import `internalAuthMiddleware` — check if they do, and mock if needed.

**create-lead:**

- Route: `POST /api/internal/leads`
- Uses createTenantClient + container.resolve(CreateProposal)
- Body: `{ organizationId, clientName, phone, email, insuranceType, notes }`
- Direct prisma: client.findFirst, client.create, member.findFirst

**list-proposals / list-policies:**

- Route: `GET /api/internal/proposals`, `GET /api/internal/policies`
- Direct prisma queries
- Query: `?clientId=c-1` or `?phone=11999999999`

**search-clients:**

- Route: `GET /api/internal/clients/search`
- Direct prisma with hash comparison
- Query: `?phone=11999999999` or `?document=12345678901`

**create-claim:**

- Route: `POST /api/internal/claims`
- Uses createTenantClient + container.resolve(CreateClaim)

**update-client / update-proposal-details:**

- Direct prisma updates

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/internal/leads/__tests__/ --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/internal/leads/__tests__/
git commit -m "test: add internal route handler tests"
```

---

## Task 14: Stats Tests (2 handlers)

**Files:**

- Create: `apps/server/src/routes/v1/stats/__tests__/get-dashboard-stats.spec.ts`
- Create: `apps/server/src/routes/v1/stats/__tests__/export-dashboard-pdf.spec.ts`

- [ ] **Step 1: Write test files**

**get-dashboard-stats:**

- Route: `GET /api/v1/stats/dashboard`
- Category B: uses `request.tenantPrisma` for multiple aggregation queries
- Query: `?preset=30d`
- Also resolves CacheService from container
- Mock tenantPrisma with all needed model methods (proposal.count, policy.count, commission.aggregate, etc.)

**export-dashboard-pdf:**

- Route: `POST /api/v1/stats/dashboard/pdf`
- Category D: PDF rendering + storage
- Mock `@react-pdf/renderer`, StorageProvider
- Returns 200 with `{ url }`

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/stats/__tests__/ --reporter=verbose`

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/stats/__tests__/
git commit -m "test: add stats route handler tests"
```

---

## Task 15: Final Verification

- [ ] **Step 1: Run ALL server tests**

Run: `pnpm --filter @app/server exec vitest run --reporter=verbose`
Expected: All tests pass (original 3 + new ~300)

- [ ] **Step 2: Run quality gates**

Run: `pnpm lint && pnpm typecheck`
Expected: Zero errors

- [ ] **Step 3: Run full build**

Run: `pnpm build`
Expected: Success

- [ ] **Step 4: Commit any fixes**

If any quality gate failed, fix and commit.
