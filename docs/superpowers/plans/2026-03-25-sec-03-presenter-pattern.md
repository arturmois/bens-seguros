# SEC-03 Presenter Pattern — PII Masking in API Responses

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement role-based PII masking so API responses never leak full CPF/CNPJ to unauthorized roles (LGPD compliance).

**Architecture:** A `ClientPresenter` in the application layer transforms raw `ClientData` into role-appropriate DTOs before the HTTP handler sends them. List endpoints always mask documents; detail endpoints expose full documents only to MANAGER+ or COMMERCIAL users viewing their own clients. A new `salespersonId` column on the Client model enables ownership checks.

**Tech Stack:** TypeScript, Vitest, Prisma 7, Fastify 5, `@repo/shared` (existing `maskDocument`)

**Spec:** `docs/plans/fix/SEC-03-presenter-pattern.md`

---

## File Structure

| Action | File                                                                       | Responsibility                                                        |
| ------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Create | `packages/core/src/modules/client/application/client-presenter.ts`         | Presenter with `toList()` and `toDetail()` — role-based PII filtering |
| Create | `packages/core/src/modules/client/application/client-presenter.spec.ts`    | Unit tests for all presenter scenarios                                |
| Modify | `packages/core/src/modules/client/domain/client-repository.ts`             | Add `salespersonId` to `ClientData` interface                         |
| Modify | `packages/core/src/modules/client/infrastructure/client-mapper.ts:46-83`   | Map `salespersonId` from Prisma row                                   |
| Modify | `packages/core/src/modules/client/index.ts`                                | Export `ClientPresenter` and response types                           |
| Modify | `packages/db/prisma/schema.prisma:244-271`                                 | Add `salespersonId` column + relation to Client model                 |
| Modify | `apps/server/src/routes/v1/client-routes.ts:240-272`                       | Apply presenter in list & detail handlers                             |
| Modify | `apps/server/src/routes/v1/client-routes.ts:57-78`                         | Apply presenter in create handler response                            |
| Modify | `apps/server/src/routes/v1/client-routes.ts:274-294`                       | Apply presenter in update handler response                            |
| Modify | `packages/core/src/modules/client/application/export-clients-csv.ts:41-55` | Mask document in CSV export                                           |

**Out of scope (follow-up):** Applying presenter pattern to Proposal/Policy endpoints that reference Client data. This plan establishes the pattern on Client; extending it is mechanical and will be a separate task.

---

## Task 1: Add `salespersonId` to Client Prisma Schema

**Files:**

- Modify: `packages/db/prisma/schema.prisma:244-271`

- [ ] **Step 1: Add the column and relation**

In `schema.prisma`, inside `model Client`, add after the `consentLgpd` field (line 258):

```prisma
  salespersonId String?
```

And add the relation inside the relations block (after line 266):

```prisma
  salesperson User? @relation("ClientSalesperson", fields: [salespersonId], references: [id])
```

Also add an index:

```prisma
  @@index([organizationId, salespersonId])
```

And in `model User`, add the back-relation (find the User model's relations block):

```prisma
  clientsAsSalesperson Client[] @relation("ClientSalesperson")
```

- [ ] **Step 2: Generate and apply migration**

Run:

```bash
cd /home/artur/projects && pnpm --filter @repo/db exec prisma migrate dev --name add-client-salesperson-id
```

Expected: Migration created and applied successfully.

- [ ] **Step 3: Regenerate Prisma client**

Run:

```bash
cd /home/artur/projects && pnpm --filter @repo/db exec prisma generate
```

Expected: Prisma Client generated successfully.

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(db): add salespersonId to Client model for ownership-based PII masking"
```

---

## Task 2: Update `ClientData` Interface and Mapper

**Files:**

- Modify: `packages/core/src/modules/client/domain/client-repository.ts:1-17`
- Modify: `packages/core/src/modules/client/infrastructure/client-mapper.ts:46-83`

- [ ] **Step 1: Add `salespersonId` to `ClientData` interface**

In `packages/core/src/modules/client/domain/client-repository.ts`, add after the `consentLgpd` field (line 15):

```typescript
salespersonId: string | null
```

- [ ] **Step 2: Add `salespersonId` to `CreateClientInput` interface**

In the same file, add after the `consentLgpd` field in `CreateClientInput` (line 59):

```typescript
  salespersonId?: string | null
```

- [ ] **Step 3: Update the mapper `toDomain` method**

In `packages/core/src/modules/client/infrastructure/client-mapper.ts`, inside the `toDomain` return object (around line 66-83), add:

```typescript
      salespersonId: row.salespersonId ?? null,
```

- [ ] **Step 4: Update PrismaClientRepository `create` method**

In `packages/core/src/modules/client/infrastructure/prisma-client-repository.ts`, in the `create` method's `data` object (around line 23-43), add:

```typescript
        salespersonId: data.salespersonId ?? null,
```

- [ ] **Step 5: Verify typecheck passes**

Run:

```bash
cd /home/artur/projects && pnpm --filter @repo/core exec tsc --noEmit
```

Expected: No errors. All existing code that spreads `ClientData` will now include `salespersonId: null` by default.

- [ ] **Step 6: Update test fixture `makeClientData`**

In `packages/core/src/modules/client/application/get-client.spec.ts`, add `salespersonId: null` to the `makeClientData` default return (line 9-28).

In `packages/core/src/modules/client/application/create-client.spec.ts`, add the same.

- [ ] **Step 7: Run existing tests**

Run:

```bash
cd /home/artur/projects && pnpm --filter @repo/core test
```

Expected: All existing tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/core/ packages/db/
git commit -m "feat(core): add salespersonId to ClientData interface and mapper"
```

---

## Task 3: Create `ClientPresenter` with Tests (TDD)

**Files:**

- Create: `packages/core/src/modules/client/application/client-presenter.spec.ts`
- Create: `packages/core/src/modules/client/application/client-presenter.ts`

- [ ] **Step 1: Write the test file**

Create `packages/core/src/modules/client/application/client-presenter.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import type { ClientData } from '../domain/client-repository.js'
import { ClientPresenter } from './client-presenter.js'

function makeClient(overrides: Partial<ClientData> = {}): ClientData {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    name: 'Maria Silva',
    document: '12345678901',
    type: 'CLIENT',
    email: 'maria@test.com',
    phone: '11999990000',
    birthDate: new Date('1990-01-15'),
    profession: 'Engenheira',
    maritalStatus: 'SINGLE',
    address: { street: 'Rua A', city: 'SP', state: 'SP', zip: '01000000' },
    tags: ['vip'],
    consentLgpd: true,
    salespersonId: 'user-sales-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('ClientPresenter.toList', () => {
  it('masks the document for all roles', () => {
    const client = makeClient()
    const result = ClientPresenter.toList(client)

    expect(result.document).toBe('***.***.890-01')
    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('phone')
    expect(result).not.toHaveProperty('address')
    expect(result).not.toHaveProperty('birthDate')
    expect(result).not.toHaveProperty('profession')
    expect(result).not.toHaveProperty('maritalStatus')
    expect(result).not.toHaveProperty('documentEncrypted')
    expect(result).not.toHaveProperty('documentHash')
  })

  it('includes only id, name, type, tags, document, createdAt', () => {
    const client = makeClient()
    const result = ClientPresenter.toList(client)

    expect(Object.keys(result).sort()).toEqual(
      ['id', 'name', 'type', 'tags', 'document', 'createdAt'].sort()
    )
  })

  it('masks a CNPJ document', () => {
    const client = makeClient({ document: '12345678000195' })
    const result = ClientPresenter.toList(client)

    expect(result.document).toBe('**.***.***/0001-95')
  })
})

describe('ClientPresenter.toDetail', () => {
  it('shows full document for OWNER role', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'OWNER',
      userId: 'other-user',
    })

    expect(result.document).toBe('12345678901')
    expect(result.email).toBe('maria@test.com')
    expect(result.phone).toBe('11999990000')
  })

  it('shows full document for ADMIN role', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'ADMIN',
      userId: 'other-user',
    })

    expect(result.document).toBe('12345678901')
  })

  it('shows full document for MANAGER role', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'MANAGER',
      userId: 'other-user',
    })

    expect(result.document).toBe('12345678901')
  })

  it('shows full document for COMMERCIAL viewing own client', () => {
    const client = makeClient({ salespersonId: 'user-sales-1' })
    const result = ClientPresenter.toDetail(client, {
      role: 'COMMERCIAL',
      userId: 'user-sales-1',
    })

    expect(result.document).toBe('12345678901')
    expect(result.email).toBe('maria@test.com')
    expect(result.phone).toBe('11999990000')
    expect(result.birthDate).toBeInstanceOf(Date)
    expect(result.address).toBeDefined()
  })

  it('masks document for COMMERCIAL viewing another salesperson client', () => {
    const client = makeClient({ salespersonId: 'user-sales-other' })
    const result = ClientPresenter.toDetail(client, {
      role: 'COMMERCIAL',
      userId: 'user-sales-1',
    })

    expect(result.document).toBe('***.***.890-01')
    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('phone')
    expect(result).not.toHaveProperty('address')
    expect(result).not.toHaveProperty('birthDate')
  })

  it('masks document for COMMERCIAL when client has no salesperson', () => {
    const client = makeClient({ salespersonId: null })
    const result = ClientPresenter.toDetail(client, {
      role: 'COMMERCIAL',
      userId: 'user-sales-1',
    })

    expect(result.document).toBe('***.***.890-01')
  })

  it('masks document for VIEWER regardless', () => {
    const client = makeClient({ salespersonId: 'user-sales-1' })
    const result = ClientPresenter.toDetail(client, {
      role: 'VIEWER',
      userId: 'user-sales-1',
    })

    expect(result.document).toBe('***.***.890-01')
    expect(result).not.toHaveProperty('email')
    expect(result).not.toHaveProperty('phone')
    expect(result).not.toHaveProperty('address')
    expect(result).not.toHaveProperty('birthDate')
  })

  it('never includes organizationId in response', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'OWNER',
      userId: 'user-1',
    })

    expect(result).not.toHaveProperty('organizationId')
  })

  it('never includes salespersonId in response', () => {
    const client = makeClient()
    const result = ClientPresenter.toDetail(client, {
      role: 'OWNER',
      userId: 'user-1',
    })

    expect(result).not.toHaveProperty('salespersonId')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /home/artur/projects && pnpm --filter @repo/core exec vitest run src/modules/client/application/client-presenter.spec.ts
```

Expected: FAIL — `client-presenter.ts` does not exist yet.

- [ ] **Step 3: Implement the presenter**

Create `packages/core/src/modules/client/application/client-presenter.ts`:

```typescript
import { maskDocument } from '@repo/shared'
import type { Role } from '@repo/auth'
import type { ClientData } from '../domain/client-repository.js'

interface PresenterContext {
  role: Role
  userId: string
}

interface ClientListItem {
  id: string
  name: string
  type: ClientData['type']
  tags: string[]
  document: string
  createdAt: Date
}

interface ClientDetail {
  id: string
  name: string
  type: ClientData['type']
  tags: string[]
  document: string
  consentLgpd: boolean
  createdAt: Date
  updatedAt: Date
  email?: string | null
  phone?: string | null
  birthDate?: Date | null
  profession?: string | null
  maritalStatus?: ClientData['maritalStatus']
  address?: ClientData['address']
}

function canSeeFullPii(client: ClientData, ctx: PresenterContext): boolean {
  if (ctx.role === 'OWNER' || ctx.role === 'ADMIN' || ctx.role === 'MANAGER') {
    return true
  }
  if (ctx.role === 'COMMERCIAL' && client.salespersonId === ctx.userId) {
    return true
  }
  return false
}

export const ClientPresenter = {
  toList(client: ClientData): ClientListItem {
    return {
      id: client.id,
      name: client.name,
      type: client.type,
      tags: client.tags,
      document: maskDocument(client.document),
      createdAt: client.createdAt,
    }
  },

  toDetail(client: ClientData, ctx: PresenterContext): ClientDetail {
    const full = canSeeFullPii(client, ctx)

    const base: ClientDetail = {
      id: client.id,
      name: client.name,
      type: client.type,
      tags: client.tags,
      document: full ? client.document : maskDocument(client.document),
      consentLgpd: client.consentLgpd,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    }

    if (full) {
      base.email = client.email
      base.phone = client.phone
      base.birthDate = client.birthDate
      base.profession = client.profession
      base.maritalStatus = client.maritalStatus
      base.address = client.address
    }

    return base
  },
}

export type { ClientListItem, ClientDetail, PresenterContext }
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /home/artur/projects && pnpm --filter @repo/core exec vitest run src/modules/client/application/client-presenter.spec.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/client/application/client-presenter.ts packages/core/src/modules/client/application/client-presenter.spec.ts
git commit -m "feat(core): add ClientPresenter with role-based PII masking (SEC-03)"
```

---

## Task 4: Export Presenter from Module Index

**Files:**

- Modify: `packages/core/src/modules/client/index.ts`

- [ ] **Step 1: Add exports**

In `packages/core/src/modules/client/index.ts`, add at the end of the "Application" section (after line 24):

```typescript
export { ClientPresenter } from './application/client-presenter.js'
export type {
  ClientListItem,
  ClientDetail,
  PresenterContext,
} from './application/client-presenter.js'
```

- [ ] **Step 2: Verify typecheck**

Run:

```bash
cd /home/artur/projects && pnpm --filter @repo/core exec tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/client/index.ts
git commit -m "feat(core): export ClientPresenter from client module index"
```

---

## Task 5: Apply Presenter in Route Handlers

**Files:**

- Modify: `apps/server/src/routes/v1/client-routes.ts`

- [ ] **Step 1: Add import**

At the top of `client-routes.ts`, add `ClientPresenter` to the `@repo/core` import (line 3-15):

```typescript
import {
  CreateClient,
  ExportClientsCsv,
  ParseClientImport,
  CsvImportError,
  MAX_IMPORT_FILE_SIZE,
  ListClients,
  GetClient,
  UpdateClient,
  DeleteClient,
  ClientAlreadyExistsError,
  ClientNotFoundError,
  ClientPresenter,
} from '@repo/core'
```

- [ ] **Step 2: Apply presenter in List endpoint (GET /api/v1/clients)**

Replace the response in the list handler (lines 251-256):

**Before:**

```typescript
return reply.send({
  success: true,
  data: result.items,
  meta: { total: result.total, nextCursor: result.nextCursor },
})
```

**After:**

```typescript
return reply.send({
  success: true,
  data: result.items.map((c) => ClientPresenter.toList(c)),
  meta: { total: result.total, nextCursor: result.nextCursor },
})
```

- [ ] **Step 3: Apply presenter in Detail endpoint (GET /api/v1/clients/:id)**

Replace the response in the detail handler (line 267):

**Before:**

```typescript
return reply.send({ success: true, data: client })
```

**After:**

```typescript
return reply.send({
  success: true,
  data: ClientPresenter.toDetail(client, {
    role: request.role!,
    userId: request.user!.id,
  }),
})
```

- [ ] **Step 4: Apply presenter in Create endpoint + auto-set salespersonId (POST /api/v1/clients)**

In the create handler (line 60-78), pass `salespersonId` from the current user when role is COMMERCIAL, and apply presenter to response:

**Before:**

```typescript
      const body = createClientBodySchema.parse(request.body)
      const useCase = container.resolve(CreateClient)
      try {
        const client = await useCase.execute({
          organizationId: request.organizationId!,
          ...body,
        })
```

**After:**

```typescript
      const body = createClientBodySchema.parse(request.body)
      const useCase = container.resolve(CreateClient)
      try {
        const client = await useCase.execute({
          organizationId: request.organizationId!,
          ...body,
          salespersonId: request.user!.id,
        })
```

Also replace the response (line 74):

**Before:**

```typescript
return reply.status(201).send({ success: true, data: client })
```

**After:**

```typescript
return reply.status(201).send({
  success: true,
  data: ClientPresenter.toDetail(client, {
    role: request.role!,
    userId: request.user!.id,
  }),
})
```

- [ ] **Step 5: Apply presenter in Update endpoint (PUT /api/v1/clients/:id)**

Replace the response in the update handler (line 289):

**Before:**

```typescript
return reply.send({ success: true, data: updated })
```

**After:**

```typescript
return reply.send({
  success: true,
  data: ClientPresenter.toDetail(updated, {
    role: request.role!,
    userId: request.user!.id,
  }),
})
```

- [ ] **Step 6: Verify typecheck**

Run:

```bash
cd /home/artur/projects && pnpm typecheck
```

Expected: No errors.

- [ ] **Step 7: Run full test suite**

Run:

```bash
cd /home/artur/projects && pnpm test
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/routes/v1/client-routes.ts
git commit -m "feat(server): apply ClientPresenter to all client route responses (SEC-03)"
```

---

## Task 6: Mask PII in CSV Export

**Files:**

- Modify: `packages/core/src/modules/client/application/export-clients-csv.ts:41-55`

The CSV export currently outputs full decrypted documents. It must use `maskDocument` since it is a list-level export.

- [ ] **Step 1: Add maskDocument import**

In `packages/core/src/modules/client/application/export-clients-csv.ts`, add at the top:

```typescript
import { maskDocument } from '@repo/shared'
```

- [ ] **Step 2: Mask document in CSV row generation**

In the `execute` method, change line 45:

**Before:**

```typescript
          c.document,
```

**After:**

```typescript
          maskDocument(c.document),
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/client/application/export-clients-csv.ts
git commit -m "fix(core): mask document in CSV export for LGPD compliance (SEC-03)"
```

---

## Task 7: Verify `documentEncrypted`/`documentHash` Never Exposed

**Files:**

- Modify: `packages/core/src/modules/client/application/client-presenter.spec.ts` (add test)

This is already handled by the presenter — it constructs a new object with explicit fields rather than spreading `ClientData`. But we add explicit regression tests.

- [ ] **Step 1: Add regression tests**

Add to the existing `client-presenter.spec.ts`, inside the `ClientPresenter.toList` describe block:

```typescript
it('never includes documentEncrypted or documentHash', () => {
  const client = makeClient()
  const result = ClientPresenter.toList(client)
  const keys = Object.keys(result)

  expect(keys).not.toContain('documentEncrypted')
  expect(keys).not.toContain('documentHash')
  expect(keys).not.toContain('organizationId')
})
```

And inside the `ClientPresenter.toDetail` describe block:

```typescript
it('never includes documentEncrypted or documentHash even for OWNER', () => {
  const client = makeClient()
  const result = ClientPresenter.toDetail(client, {
    role: 'OWNER',
    userId: 'user-1',
  })
  const keys = Object.keys(result)

  expect(keys).not.toContain('documentEncrypted')
  expect(keys).not.toContain('documentHash')
})
```

- [ ] **Step 2: Run tests**

Run:

```bash
cd /home/artur/projects && pnpm --filter @repo/core exec vitest run src/modules/client/application/client-presenter.spec.ts
```

Expected: All tests pass (presenter already constructs explicit objects).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/client/application/client-presenter.spec.ts
git commit -m "test(core): add regression tests for PII field exclusion (SEC-03)"
```

---

## Task 8: Quality Gates

- [ ] **Step 1: Lint**

Run:

```bash
cd /home/artur/projects && pnpm lint
```

Expected: Zero errors.

- [ ] **Step 2: Typecheck**

Run:

```bash
cd /home/artur/projects && pnpm typecheck
```

Expected: Zero errors.

- [ ] **Step 3: Build**

Run:

```bash
cd /home/artur/projects && pnpm build
```

Expected: Successful build.

- [ ] **Step 4: All tests**

Run:

```bash
cd /home/artur/projects && pnpm test
```

Expected: All tests pass.

---

## Acceptance Criteria Checklist

| Criteria                                              | Covered In                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `maskDocument()` with tests for CPF and CNPJ          | Already exists in `@repo/shared` with tests; presenter tests verify masking output |
| List endpoints return document masked                 | Task 5 Step 2 + Task 3 `toList` tests                                              |
| Detail: COMMERCIAL sees full CPF only for own clients | Task 5 Step 3 + Task 3 `toDetail` tests                                            |
| Detail: MANAGER+ sees full CPF for all                | Task 5 Step 3 + Task 3 `toDetail` tests                                            |
| VIEWER sees only masked in any endpoint               | Task 3 `toDetail` VIEWER test                                                      |
| `documentEncrypted`/`documentHash` never exposed      | Task 7 regression tests                                                            |
| CSV export masks documents                            | Task 6                                                                             |
| `salespersonId` auto-set on client creation           | Task 5 Step 4                                                                      |
