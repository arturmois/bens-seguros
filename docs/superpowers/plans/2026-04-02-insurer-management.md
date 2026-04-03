# Insurer Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add minimal insurer management to the ERP with a dedicated dashboard page, create/edit/activate/inactivate flow, permissions for `OWNER`/`ADMIN`/`MANAGER`, and inline insurer creation from policy issuance.

**Architecture:** Reuse the existing `Insurer` domain already present in Prisma, core, and Fastify. Extend it with an update use case and `PUT /api/v1/insurers/:id`, regenerate the web API client from OpenAPI, then build a focused `features/insurers` module in the web app plus a small integration in the policy issuance sheet.

**Tech Stack:** Prisma, Fastify 5, Zod, React 19, Next.js 16, React Query 5, React Hook Form 7, Orval, Vitest

**Spec:** `docs/superpowers/specs/2026-04-02-insurer-management-design.md`

---

## File Structure

### New Files

| File                                                                   | Responsibility                                                        |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/core/src/modules/insurer/application/update-insurer.ts`      | Application use case to update name/code/active with duplicate checks |
| `packages/core/src/modules/insurer/application/update-insurer.spec.ts` | Unit tests for update insurer behavior                                |
| `apps/server/src/routes/v1/insurers/update-insurer.ts`                 | Fastify `PUT /api/v1/insurers/:id` route                              |
| `apps/web/src/app/(dashboard)/insurers/page.tsx`                       | Dedicated dashboard page for insurers                                 |
| `apps/web/src/features/insurers/hooks/use-insurers.ts`                 | React Query hooks wrapping generated insurer endpoints                |
| `apps/web/src/features/insurers/lib/schemas.ts`                        | Form schema and defaults for insurer create/edit                      |
| `apps/web/src/features/insurers/components/insurers-page.tsx`          | Page container, filters, modal state, empty/error states              |
| `apps/web/src/features/insurers/components/insurers-table.tsx`         | Insurer table and row actions                                         |
| `apps/web/src/features/insurers/components/insurers-table-toolbar.tsx` | Search/filter/CTA toolbar                                             |
| `apps/web/src/features/insurers/components/insurer-form-sheet.tsx`     | Shared create/edit sheet used by page and issuance flow               |

### Modified Files

| File                                                                            | Change                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `packages/auth/src/abilities.ts`                                                | Add `Insurer` subject and explicit insurer permissions  |
| `packages/auth/src/abilities.spec.ts`                                           | Cover insurer permissions                               |
| `apps/web/src/lib/permissions.ts`                                               | Add frontend permissions for insurers                   |
| `packages/core/src/modules/insurer/domain/insurer-repository.ts`                | Add update contract and input type                      |
| `packages/core/src/modules/insurer/infrastructure/prisma-insurer-repository.ts` | Implement update and search by code/name remains intact |
| `packages/core/src/modules/insurer/index.ts`                                    | Export `UpdateInsurer` and new input type               |
| `apps/server/src/container-registrations.ts`                                    | Register `UpdateInsurer`                                |
| `apps/server/src/routes/v1/insurers/_schemas.ts`                                | Add param and update body schema                        |
| `apps/server/src/routes/v1/insurers/create-insurer.ts`                          | Change permission to `manage Insurer`                   |
| `apps/server/src/routes/v1/insurers/list-insurers.ts`                           | Change permission to `read Insurer`                     |
| `apps/server/src/routes/v1/insurers/index.ts`                                   | Register update route                                   |
| `apps/web/src/api/endpoints/insurers/insurers.ts`                               | Orval-generated create/list/update hooks                |
| `apps/web/src/api/endpoints/insurers/insurers.zod.ts`                           | Orval-generated Zod schemas with update body            |
| `apps/web/src/api/model/*`                                                      | Generated insurer update models                         |
| `apps/web/src/components/layout/sidebar.tsx`                                    | Add `Seguradoras` nav item                              |
| `apps/web/src/features/proposals/components/issue-policy-sheet.tsx`             | Add inline insurer creation flow                        |

---

### Task 1: Add explicit insurer permissions

**Files:**

- Modify: `packages/auth/src/abilities.ts`
- Modify: `packages/auth/src/abilities.spec.ts`
- Modify: `apps/web/src/lib/permissions.ts`

- [ ] **Step 1: Write the failing permission test**

In `packages/auth/src/abilities.spec.ts`, add:

```typescript
it('ADMIN and MANAGER can manage insurers while COMMERCIAL and VIEWER cannot', () => {
  expect(defineAbilitiesFor('ADMIN').can('manage', 'Insurer')).toBe(true)
  expect(defineAbilitiesFor('MANAGER').can('manage', 'Insurer')).toBe(true)
  expect(defineAbilitiesFor('COMMERCIAL').can('manage', 'Insurer')).toBe(false)
  expect(defineAbilitiesFor('VIEWER').can('read', 'Insurer')).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/auth exec vitest run src/abilities.spec.ts`

Expected: FAIL because `Insurer` is not yet part of the CASL subject union and no insurer ability exists.

- [ ] **Step 3: Implement explicit insurer permissions**

In `packages/auth/src/abilities.ts`, update the subject union and rules:

```typescript
export type Subject =
  | 'all'
  | 'User'
  | 'Organization'
  | 'Client'
  | 'Proposal'
  | 'Policy'
  | 'Claim'
  | 'Commission'
  | 'Endorsement'
  | 'Assistance'
  | 'Document'
  | 'AuditLog'
  | 'Notification'
  | 'Member'
  | 'Invitation'
  | 'Insurer'

const OPERATIONAL_SUBJECTS: Subject[] = [
  'Client',
  'Proposal',
  'Policy',
  'Claim',
  'Endorsement',
  'Assistance',
  'Document',
  'Insurer',
]
```

In `apps/web/src/lib/permissions.ts`, add:

```typescript
  'insurers:read': ['OWNER', 'ADMIN', 'MANAGER'],
  'insurers:manage': ['OWNER', 'ADMIN', 'MANAGER'],
```

- [ ] **Step 4: Run tests again**

Run: `pnpm --filter @repo/auth exec vitest run src/abilities.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/auth/src/abilities.ts packages/auth/src/abilities.spec.ts apps/web/src/lib/permissions.ts
git commit -m "feat(auth): add explicit insurer permissions"
```

---

### Task 2: Add insurer update use case and repository support

**Files:**

- Modify: `packages/core/src/modules/insurer/domain/insurer-repository.ts`
- Modify: `packages/core/src/modules/insurer/infrastructure/prisma-insurer-repository.ts`
- Modify: `packages/core/src/modules/insurer/index.ts`
- Create: `packages/core/src/modules/insurer/application/update-insurer.ts`
- Create: `packages/core/src/modules/insurer/application/update-insurer.spec.ts`

- [ ] **Step 1: Write the failing unit tests**

Create `packages/core/src/modules/insurer/application/update-insurer.spec.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'
import type {
  InsurerData,
  InsurerRepository,
} from '../domain/insurer-repository.js'
import {
  InsurerAlreadyExistsError,
  InsurerNotFoundError,
} from '../domain/insurer-errors.js'
import { UpdateInsurer } from './update-insurer.js'

function makeInsurer(overrides: Partial<InsurerData> = {}): InsurerData {
  return {
    id: 'ins-1',
    organizationId: 'org-1',
    name: 'Porto Seguro',
    code: null,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function createRepo({
  current,
  duplicate,
}: {
  current: InsurerData | null
  duplicate: InsurerData | null
}): InsurerRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(current),
    findByName: vi.fn().mockResolvedValue(duplicate),
    findMany: vi.fn(),
    update: vi.fn().mockImplementation(async (input) =>
      makeInsurer({
        id: input.id,
        organizationId: input.organizationId,
        name: input.name,
        code: input.code ?? null,
        active: input.active ?? true,
      })
    ),
  }
}

describe('UpdateInsurer', () => {
  it('updates insurer when id exists and name is unique', async () => {
    const repo = createRepo({
      current: makeInsurer(),
      duplicate: null,
    })
    const useCase = new UpdateInsurer(repo)

    const result = await useCase.execute({
      id: 'ins-1',
      organizationId: 'org-1',
      name: 'Allianz',
      code: 'ALZ',
      active: false,
    })

    expect(repo.findById).toHaveBeenCalledWith('ins-1', 'org-1')
    expect(repo.findByName).toHaveBeenCalledWith('Allianz', 'org-1')
    expect(repo.update).toHaveBeenCalledWith({
      id: 'ins-1',
      organizationId: 'org-1',
      name: 'Allianz',
      code: 'ALZ',
      active: false,
    })
    expect(result.active).toBe(false)
  })

  it('throws InsurerNotFoundError when insurer does not exist', async () => {
    const repo = createRepo({ current: null, duplicate: null })
    const useCase = new UpdateInsurer(repo)

    await expect(
      useCase.execute({
        id: 'missing',
        organizationId: 'org-1',
        name: 'Allianz',
        code: '',
        active: true,
      })
    ).rejects.toThrow(InsurerNotFoundError)
  })

  it('throws InsurerAlreadyExistsError when another insurer already uses the name', async () => {
    const repo = createRepo({
      current: makeInsurer({ id: 'ins-1', name: 'Porto Seguro' }),
      duplicate: makeInsurer({ id: 'ins-2', name: 'Allianz' }),
    })
    const useCase = new UpdateInsurer(repo)

    await expect(
      useCase.execute({
        id: 'ins-1',
        organizationId: 'org-1',
        name: 'Allianz',
        code: '',
        active: true,
      })
    ).rejects.toThrow(InsurerAlreadyExistsError)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/core exec vitest run src/modules/insurer/application/update-insurer.spec.ts`

Expected: FAIL because `UpdateInsurer` and `update()` do not exist yet.

- [ ] **Step 3: Add repository contract and use case**

In `packages/core/src/modules/insurer/domain/insurer-repository.ts`, add:

```typescript
export interface UpdateInsurerInput {
  id: string
  organizationId: string
  name: string
  code?: string
  active?: boolean
}

export interface InsurerRepository {
  create(data: CreateInsurerInput): Promise<InsurerData>
  findById(id: string, organizationId: string): Promise<InsurerData | null>
  findByName(name: string, organizationId: string): Promise<InsurerData | null>
  findMany(
    filters: InsurerFilters,
    page: CursorPage
  ): Promise<Page<InsurerData>>
  update(data: UpdateInsurerInput): Promise<InsurerData>
}
```

Create `packages/core/src/modules/insurer/application/update-insurer.ts`:

```typescript
import { injectable, inject } from 'tsyringe'
import type {
  InsurerData,
  InsurerRepository,
  UpdateInsurerInput,
} from '../domain/insurer-repository.js'
import { InsurerErrors } from '../domain/insurer-errors.js'

@injectable()
export class UpdateInsurer {
  constructor(
    @inject('InsurerRepository') private readonly insurerRepo: InsurerRepository
  ) {}

  async execute(dto: UpdateInsurerInput): Promise<InsurerData> {
    const current = await this.insurerRepo.findById(dto.id, dto.organizationId)
    if (!current) {
      throw InsurerErrors.notFound(dto.id)
    }

    const duplicate = await this.insurerRepo.findByName(
      dto.name,
      dto.organizationId
    )
    if (duplicate && duplicate.id !== dto.id) {
      throw InsurerErrors.alreadyExists(dto.name)
    }

    return this.insurerRepo.update(dto)
  }
}
```

In `packages/core/src/modules/insurer/infrastructure/prisma-insurer-repository.ts`, add:

```typescript
  async update(data: UpdateInsurerInput): Promise<InsurerData> {
    const row = await this.prisma.insurer.update({
      where: { id: data.id },
      data: {
        name: data.name,
        code: data.code ?? null,
        ...(data.active !== undefined && { active: data.active }),
      },
    })

    return InsurerMapper.toDomain(row)
  }
```

In `packages/core/src/modules/insurer/index.ts`, export:

```typescript
export type { UpdateInsurerInput } from './domain/insurer-repository.js'
export { UpdateInsurer } from './application/update-insurer.js'
```

- [ ] **Step 4: Run insurer tests**

Run: `pnpm --filter @repo/core exec vitest run src/modules/insurer/application/create-insurer.spec.ts src/modules/insurer/application/update-insurer.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/insurer/domain/insurer-repository.ts packages/core/src/modules/insurer/infrastructure/prisma-insurer-repository.ts packages/core/src/modules/insurer/index.ts packages/core/src/modules/insurer/application/update-insurer.ts packages/core/src/modules/insurer/application/update-insurer.spec.ts
git commit -m "feat(insurer): add update use case and repository support"
```

---

### Task 3: Expose insurer update in the Fastify API

**Files:**

- Modify: `apps/server/src/container-registrations.ts`
- Modify: `apps/server/src/routes/v1/insurers/_schemas.ts`
- Modify: `apps/server/src/routes/v1/insurers/create-insurer.ts`
- Modify: `apps/server/src/routes/v1/insurers/list-insurers.ts`
- Modify: `apps/server/src/routes/v1/insurers/index.ts`
- Create: `apps/server/src/routes/v1/insurers/update-insurer.ts`

- [ ] **Step 1: Write the new route file first**

Create `apps/server/src/routes/v1/insurers/update-insurer.ts`:

```typescript
import { container, UpdateInsurer, type CacheService } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditUpdate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  idParamSchema,
  updateInsurerBodySchema,
  insurerDetailResponse,
} from './_schemas.js'

function resolveCache(): CacheService | null {
  try {
    return container.resolve<CacheService>('CacheService')
  } catch {
    return null
  }
}

export function updateInsurerRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/v1/insurers/:id',
    schema: {
      operationId: 'updateInsurer',
      tags: ['Insurers'],
      summary: 'Update an insurer',
      params: idParamSchema,
      body: updateInsurerBodySchema,
      response: { 200: insurerDetailResponse },
    },
    preHandler: [requireAbility('manage', 'Insurer')],
    handler: async (request, reply) => {
      const useCase = container.resolve(UpdateInsurer)
      try {
        const insurer = await useCase.execute({
          id: request.params.id,
          organizationId: request.organizationId!,
          ...request.body,
        })

        auditUpdate({
          request,
          entityType: 'Insurer',
          entityId: insurer.id,
          after: insurer,
        })

        const cacheService = resolveCache()
        if (cacheService) {
          await cacheService.delete(`cache:${request.organizationId!}:insurers`)
        }

        return reply.send({ success: true, data: insurer })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
```

- [ ] **Step 2: Run server typecheck to capture missing wiring**

Run: `pnpm --filter @app/server typecheck`

Expected: FAIL because `UpdateInsurer`, `idParamSchema`, and `updateInsurerBodySchema` are not wired yet.

- [ ] **Step 3: Wire schemas, permissions, and container registration**

In `apps/server/src/routes/v1/insurers/_schemas.ts`, add:

```typescript
import { idParam } from '../../_shared/params.schema.js'

export const updateInsurerBodySchema = z.object({
  name: z.string().min(1),
  code: optionalString,
  active: z.boolean(),
})

export { idParam as idParamSchema }
```

In `apps/server/src/routes/v1/insurers/create-insurer.ts`, change:

```typescript
    preHandler: [requireAbility('manage', 'Insurer')],
```

In `apps/server/src/routes/v1/insurers/list-insurers.ts`, change:

```typescript
    preHandler: [requireAbility('read', 'Insurer')],
```

In `apps/server/src/routes/v1/insurers/index.ts`, register the route:

```typescript
import { updateInsurerRoute } from './update-insurer.js'

export async function insurerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  createInsurerRoute(app)
  listInsurersRoute(app)
  updateInsurerRoute(app)
}
```

In `apps/server/src/container-registrations.ts`, add:

```typescript
import { UpdateInsurer } from '@repo/core'
```

and register:

```typescript
container.register(UpdateInsurer, {
  useFactory: () => new UpdateInsurer(insurerRepo),
})
```

- [ ] **Step 4: Run server typecheck again**

Run: `pnpm --filter @app/server typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/container-registrations.ts apps/server/src/routes/v1/insurers/_schemas.ts apps/server/src/routes/v1/insurers/create-insurer.ts apps/server/src/routes/v1/insurers/list-insurers.ts apps/server/src/routes/v1/insurers/index.ts apps/server/src/routes/v1/insurers/update-insurer.ts
git commit -m "feat(server): add insurer update endpoint"
```

---

### Task 4: Regenerate the web API client for insurers

**Files:**

- Modify: `apps/web/src/api/endpoints/insurers/insurers.ts`
- Modify: `apps/web/src/api/endpoints/insurers/insurers.zod.ts`
- Modify: `apps/web/src/api/model/*` (generated)

- [ ] **Step 1: Ensure the Fastify app is serving OpenAPI locally**

In a separate terminal, run:

```bash
pnpm --filter @app/server dev
```

Then verify:

```bash
curl -s http://localhost:3001/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 2: Regenerate Orval client and Zod schemas**

Run:

```bash
pnpm --filter @app/web generate:api
```

Expected: PASS and generated insurer update functions/models appear under `src/api/endpoints/insurers` and `src/api/model`.

- [ ] **Step 3: Verify generated update endpoint exists**

Run:

```bash
rg -n "updateInsurer|UpdateInsurerBody" apps/web/src/api/endpoints/insurers apps/web/src/api/model
```

Expected: matches for `updateInsurer`, `useUpdateInsurer`, and generated models such as `updateInsurerBody`.

- [ ] **Step 4: Commit generated API files**

```bash
git add apps/web/src/api/endpoints/insurers apps/web/src/api/model
git commit -m "chore(api): regenerate insurer endpoint client"
```

---

### Task 5: Build the insurers feature in the web app

**Files:**

- Create: `apps/web/src/app/(dashboard)/insurers/page.tsx`
- Create: `apps/web/src/features/insurers/hooks/use-insurers.ts`
- Create: `apps/web/src/features/insurers/lib/schemas.ts`
- Create: `apps/web/src/features/insurers/components/insurers-page.tsx`
- Create: `apps/web/src/features/insurers/components/insurers-table.tsx`
- Create: `apps/web/src/features/insurers/components/insurers-table-toolbar.tsx`
- Create: `apps/web/src/features/insurers/components/insurer-form-sheet.tsx`

- [ ] **Step 1: Create insurer hooks and form schema**

Create `apps/web/src/features/insurers/lib/schemas.ts`:

```typescript
import { z } from 'zod'
import { CreateInsurerBody } from '@/api/endpoints/insurers/insurers.zod'

export const insurerFormSchema = CreateInsurerBody.extend({
  active: z.boolean().default(true),
})

export type InsurerFormValues = z.infer<typeof insurerFormSchema>

export const DEFAULT_INSURER_FORM: InsurerFormValues = {
  name: '',
  code: '',
  active: true,
}
```

Create `apps/web/src/features/insurers/hooks/use-insurers.ts`:

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-client'
import {
  useListInsurers,
  createInsurer,
  updateInsurer,
  getListInsurersQueryKey,
} from '@/api/endpoints/insurers/insurers'
import type {
  CreateInsurerBody,
  ListInsurersParams,
  ListInsurers200DataItem,
  UpdateInsurerBody,
} from '@/api/model'

export type InsurerItem = ListInsurers200DataItem
export type InsurerStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export function useInsurers(filters: ListInsurersParams = {}) {
  return useListInsurers(filters, {
    query: {
      select: (response) => ({
        data: response.data.data,
        meta: response.data.meta,
      }),
    },
  })
}

function handleInsurerError(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.code === 'INSURER_ALREADY_EXISTS') {
    toast.error(error.message)
    return
  }
  toast.error(fallback)
}

export function useCreateInsurerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: CreateInsurerBody) => {
      const response = await createInsurer(body)
      return response.data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getListInsurersQueryKey(),
      })
      toast.success('Seguradora criada com sucesso')
    },
    onError: (error) => handleInsurerError(error, 'Erro ao criar seguradora'),
  })
}

export function useUpdateInsurerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string
      body: UpdateInsurerBody
    }) => {
      const response = await updateInsurer(id, body)
      return response.data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getListInsurersQueryKey(),
      })
      toast.success('Seguradora atualizada com sucesso')
    },
    onError: (error) =>
      handleInsurerError(error, 'Erro ao atualizar seguradora'),
  })
}
```

- [ ] **Step 2: Create the shared insurer form sheet**

Create `apps/web/src/features/insurers/components/insurer-form-sheet.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { ListInsurers200DataItem } from '@/api/model'
import {
  DEFAULT_INSURER_FORM,
  insurerFormSchema,
  type InsurerFormValues,
} from '../lib/schemas'
import {
  useCreateInsurerMutation,
  useUpdateInsurerMutation,
} from '../hooks/use-insurers'

interface InsurerFormSheetProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly insurer?: ListInsurers200DataItem
  readonly onSuccess?: (insurer: ListInsurers200DataItem) => void
}

export function InsurerFormSheet({
  open,
  onOpenChange,
  insurer,
  onSuccess,
}: InsurerFormSheetProps) {
  const isEditMode = Boolean(insurer)
  const createMutation = useCreateInsurerMutation()
  const updateMutation = useUpdateInsurerMutation()
  const isPending = createMutation.isPending || updateMutation.isPending

  const form = useForm<InsurerFormValues>({
    resolver: zodResolver(insurerFormSchema),
    defaultValues: DEFAULT_INSURER_FORM,
  })

  useEffect(() => {
    if (!open) return
    if (insurer) {
      form.reset({
        name: insurer.name,
        code: insurer.code ?? '',
        active: insurer.active,
      })
      return
    }
    form.reset(DEFAULT_INSURER_FORM)
  }, [open, insurer, form])

  function handleSubmit(values: InsurerFormValues) {
    if (isEditMode && insurer) {
      updateMutation.mutate(
        {
          id: insurer.id,
          body: values,
        },
        {
          onSuccess: (updated) => {
            onSuccess?.(updated)
            onOpenChange(false)
          },
        }
      )
      return
    }

    createMutation.mutate(values, {
      onSuccess: (created) => {
        onSuccess?.(created)
        onOpenChange(false)
      },
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? 'Editar seguradora' : 'Nova seguradora'}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Atualize os dados da seguradora.'
              : 'Cadastre uma seguradora para uso em propostas, apólices e sinistros.'}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="mt-6 space-y-4 px-6"
        >
          <FormField
            label="Nome da seguradora"
            error={form.formState.errors.name?.message}
            required
          >
            <Input placeholder="Ex: Porto Seguro" {...form.register('name')} />
          </FormField>

          <FormField
            label="Código"
            error={form.formState.errors.code?.message}
            helperText="Opcional. Use quando a operação precisar de um código interno."
          >
            <Input placeholder="Ex: PSEG" {...form.register('code')} />
          </FormField>

          {isEditMode && (
            <Controller
              name="active"
              control={form.control}
              render={({ field }) => (
                <div className="border-border flex items-center justify-between rounded-lg border p-4">
                  <Label htmlFor="insurer-active" className="cursor-pointer">
                    Ativa
                  </Label>
                  <Switch
                    id="insurer-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEditMode ? 'Salvar' : 'Criar seguradora'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: Create the page, toolbar, table, and route**

Create `apps/web/src/features/insurers/components/insurers-table-toolbar.tsx`:

```typescript
'use client'

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { InsurerStatusFilter } from '../hooks/use-insurers'

interface InsurersTableToolbarProps {
  readonly search: string
  readonly status: InsurerStatusFilter
  readonly onSearchChange: (value: string) => void
  readonly onStatusChange: (value: InsurerStatusFilter) => void
  readonly onCreate: () => void
}

export function InsurersTableToolbar({
  search,
  status,
  onSearchChange,
  onStatusChange,
  onCreate,
}: InsurersTableToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute left-3 top-2.5 size-4" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          placeholder="Buscar por nome ou código..."
          aria-label="Buscar seguradoras"
        />
      </div>

      <Select value={status} onValueChange={(value) => onStatusChange(value as InsurerStatusFilter)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas</SelectItem>
          <SelectItem value="ACTIVE">Ativas</SelectItem>
          <SelectItem value="INACTIVE">Inativas</SelectItem>
        </SelectContent>
      </Select>

      <Button onClick={onCreate}>Nova seguradora</Button>
    </div>
  )
}
```

Create `apps/web/src/features/insurers/components/insurers-table.tsx`:

```typescript
'use client'

import { MoreHorizontal, Pencil, Power } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/formatters'
import type { InsurerItem } from '../hooks/use-insurers'

interface InsurersTableProps {
  readonly insurers: readonly InsurerItem[]
  readonly onEdit: (insurer: InsurerItem) => void
  readonly onToggleActive: (insurer: InsurerItem) => void
}

export function InsurersTable({
  insurers,
  onEdit,
  onToggleActive,
}: InsurersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Atualizado em</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {insurers.map((insurer) => (
          <TableRow
            key={insurer.id}
            className="cursor-pointer"
            tabIndex={0}
            onClick={() => onEdit(insurer)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onEdit(insurer)
              }
            }}
          >
            <TableCell className="font-medium">{insurer.name}</TableCell>
            <TableCell>{insurer.code ?? '-'}</TableCell>
            <TableCell>
              <Badge variant={insurer.active ? 'default' : 'secondary'}>
                {insurer.active ? 'Ativa' : 'Inativa'}
              </Badge>
            </TableCell>
            <TableCell>{formatDate(insurer.updatedAt)}</TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="hover:bg-accent inline-flex h-10 w-10 items-center justify-center rounded-md"
                  aria-label={`Ações da seguradora ${insurer.name}`}
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(insurer)}>
                    <Pencil />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleActive(insurer)}>
                    <Power />
                    {insurer.active ? 'Inativar' : 'Ativar'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function InsurersTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Atualizado em</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }, (_, index) => (
          <TableRow key={index}>
            <TableCell><Skeleton className="h-4 w-36" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="size-8" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

Create `apps/web/src/features/insurers/components/insurers-page.tsx`:

```typescript
'use client'

import { useMemo, useState } from 'react'
import { Building2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { useDebounce } from '@/hooks/use-debounce'
import {
  useInsurers,
  useUpdateInsurerMutation,
  type InsurerItem,
  type InsurerStatusFilter,
} from '../hooks/use-insurers'
import { InsurerFormSheet } from './insurer-form-sheet'
import { InsurersTable, InsurersTableSkeleton } from './insurers-table'
import { InsurersTableToolbar } from './insurers-table-toolbar'

export function InsurersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InsurerStatusFilter>('ACTIVE')
  const [editingInsurer, setEditingInsurer] = useState<InsurerItem | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 300)
  const updateInsurer = useUpdateInsurerMutation()

  const activeFilter = useMemo(() => {
    if (status === 'ALL') return undefined
    return status === 'ACTIVE'
  }, [status])

  const { data, isLoading, isError, refetch } = useInsurers({
    active: activeFilter,
    search: debouncedSearch || undefined,
  })

  const insurers = data?.data ?? []

  function handleCreate() {
    setEditingInsurer(undefined)
    setFormOpen(true)
  }

  function handleEdit(insurer: InsurerItem) {
    setEditingInsurer(insurer)
    setFormOpen(true)
  }

  function handleToggleActive(insurer: InsurerItem) {
    updateInsurer.mutate({
      id: insurer.id,
      body: {
        name: insurer.name,
        code: insurer.code ?? '',
        active: !insurer.active,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seguradoras</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie as seguradoras disponíveis para propostas, apólices e sinistros.
        </p>
      </div>

      <InsurersTableToolbar
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onCreate={handleCreate}
      />

      {isLoading ? (
        <InsurersTableSkeleton />
      ) : isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><AlertTriangle /></EmptyMedia>
            <EmptyTitle>Erro ao carregar seguradoras</EmptyTitle>
            <EmptyDescription>
              Não foi possível carregar o cadastro. Tente novamente.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Empty>
      ) : insurers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Building2 /></EmptyMedia>
            <EmptyTitle>
              {debouncedSearch || status !== 'ACTIVE'
                ? 'Nenhuma seguradora encontrada'
                : 'Nenhuma seguradora cadastrada'}
            </EmptyTitle>
            <EmptyDescription>
              {debouncedSearch || status !== 'ACTIVE'
                ? 'Ajuste a busca ou os filtros para encontrar um cadastro existente.'
                : 'Cadastre a primeira seguradora para liberar a operação.'}
            </EmptyDescription>
          </EmptyHeader>
          {!debouncedSearch && status === 'ACTIVE' && (
            <Button onClick={handleCreate}>Cadastrar primeira seguradora</Button>
          )}
        </Empty>
      ) : (
        <InsurersTable
          insurers={insurers}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
        />
      )}

      <InsurerFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        insurer={editingInsurer}
      />
    </div>
  )
}
```

Create `apps/web/src/app/(dashboard)/insurers/page.tsx`:

```typescript
import { InsurersPage } from '@/features/insurers/components/insurers-page'

export default function DashboardInsurersPage() {
  return <InsurersPage />
}
```

- [ ] **Step 4: Run web typecheck**

Run: `pnpm --filter @app/web typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/'(dashboard)'/insurers/page.tsx apps/web/src/features/insurers
git commit -m "feat(web): add insurers management page"
```

---

### Task 6: Add insurers to the main sidebar

**Files:**

- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add the navigation item**

In `apps/web/src/components/layout/sidebar.tsx`, import `Building2` from `lucide-react` and add to `MAIN_NAV` after `Clientes`:

```typescript
  {
    href: '/insurers',
    label: 'Seguradoras',
    icon: Building2,
    permission: 'insurers:read',
  },
```

- [ ] **Step 2: Run web typecheck**

Run: `pnpm --filter @app/web typecheck`

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx
git commit -m "feat(nav): add insurers entry to sidebar"
```

---

### Task 7: Add inline insurer creation to policy issuance

**Files:**

- Modify: `apps/web/src/features/proposals/components/issue-policy-sheet.tsx`
- Reuse: `apps/web/src/features/insurers/components/insurer-form-sheet.tsx`

- [ ] **Step 1: Add local sheet state and callback**

In `apps/web/src/features/proposals/components/issue-policy-sheet.tsx`, add state:

```typescript
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { InsurerFormSheet } from '@/features/insurers/components/insurer-form-sheet'

const [insurerSheetOpen, setInsurerSheetOpen] = useState(false)
```

and add a callback:

```typescript
function handleInsurerCreated(insurer: { id: string }) {
  form.setValue('insurerId', insurer.id, { shouldValidate: true })
  setInsurerSheetOpen(false)
}
```

- [ ] **Step 2: Replace the insurer field content with inline fallback + action**

Replace the insurer field block with:

```tsx
<FormField
  label="Seguradora"
  error={form.formState.errors.insurerId?.message}
  required
>
  {insurers.length === 0 ? (
    <div className="border-border bg-muted/20 space-y-3 rounded-lg border border-dashed p-4">
      <div>
        <p className="font-medium">Nenhuma seguradora ativa cadastrada</p>
        <p className="text-muted-foreground text-sm">
          Cadastre uma seguradora para concluir a emissão da apólice.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => setInsurerSheetOpen(true)}
      >
        <Plus className="mr-2 size-4" />
        Cadastrar seguradora
      </Button>
    </div>
  ) : (
    <div className="space-y-3">
      <Controller
        name="insurerId"
        control={form.control}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a seguradora">
                {(value: string | null) => {
                  const item = insurers.find((i) => i.id === value)
                  return item?.name ?? null
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {insurers.map((insurer) => (
                <SelectItem key={insurer.id} value={insurer.id}>
                  {insurer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setInsurerSheetOpen(true)}
        >
          <Plus className="mr-2 size-4" />
          Nova seguradora
        </Button>
      </div>
    </div>
  )}
</FormField>
```

- [ ] **Step 3: Render the shared insurer form sheet**

At the bottom of the component, before `</Sheet>`, add:

```tsx
<InsurerFormSheet
  open={insurerSheetOpen}
  onOpenChange={setInsurerSheetOpen}
  onSuccess={handleInsurerCreated}
/>
```

- [ ] **Step 4: Run web typecheck**

Run: `pnpm --filter @app/web typecheck`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/proposals/components/issue-policy-sheet.tsx apps/web/src/features/insurers/components/insurer-form-sheet.tsx
git commit -m "feat(policies): add inline insurer creation during issuance"
```

---

### Task 8: End-to-end verification

**Files:**

- Verify only

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm --filter @repo/auth exec vitest run src/abilities.spec.ts
pnpm --filter @repo/core exec vitest run src/modules/insurer/application/create-insurer.spec.ts src/modules/insurer/application/update-insurer.spec.ts
```

Expected: PASS

- [ ] **Step 2: Run workspace typecheck**

Run: `pnpm typecheck`

Expected: PASS

- [ ] **Step 3: Run workspace lint**

Run: `pnpm lint`

Expected: PASS

- [ ] **Step 4: Manual UI verification**

Verify in browser:

1. `/insurers` appears in sidebar for `OWNER`, `ADMIN`, and `MANAGER`
2. create insurer from `/insurers` works and row appears in the table
3. edit toggling `Ativa` hides the insurer from the policy issuance select when inactive
4. proposal detail → `Emitir Apólice` shows empty state CTA when no active insurers exist
5. creating insurer from issuance sheet auto-selects the created insurer in the form

- [ ] **Step 5: Final commit**

```bash
git add packages/auth/src/abilities.ts packages/auth/src/abilities.spec.ts apps/web/src/lib/permissions.ts packages/core/src/modules/insurer apps/server/src/container-registrations.ts apps/server/src/routes/v1/insurers apps/web/src/api/endpoints/insurers apps/web/src/api/model apps/web/src/app/'(dashboard)'/insurers/page.tsx apps/web/src/features/insurers apps/web/src/components/layout/sidebar.tsx apps/web/src/features/proposals/components/issue-policy-sheet.tsx
git commit -m "feat: add insurer management and inline creation flow"
```

---

## Self-Review

### Spec coverage

- Dedicated insurer page: covered in Task 5 and Task 6
- Create/edit/activate/inactivate: covered in Task 2, Task 3, and Task 5
- `OWNER`/`ADMIN`/`MANAGER` permissions: covered in Task 1 and Task 3
- Inline creation in issuance flow: covered in Task 7
- Verification of active-only operational visibility: covered in Task 7 and Task 8

### Placeholder scan

No `TODO`, `TBD`, or “handle later” instructions remain in this plan.

### Type consistency

- Backend permission subject is consistently `Insurer`
- Frontend permission keys are consistently `insurers:read` and `insurers:manage`
- Shared web item type is consistently `ListInsurers200DataItem` via `InsurerItem`
