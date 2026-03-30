# Orval + OpenAPI Integration Design

**Date:** 2026-03-29
**Status:** Approved
**Resolves:** Audit finding P3 #8 (shared Zod schemas)

## Problem

Frontend and backend maintain separate Zod schemas, types, and React Query hooks manually. This leads to:

- 15 frontend Zod schemas duplicating 19 backend schemas with inconsistent validation rules
- 84 manually written React Query hooks
- ~20 manual type definition files that can drift from backend contracts
- Fields missing on frontend that backend expects (e.g., `estimatedValueInCents` on claims)
- Different data types for same field (e.g., `z.coerce.date()` vs `z.string()` for dates)

## Solution

Use Orval to auto-generate frontend code (hooks, types, Zod schemas) from the backend's OpenAPI spec. The backend becomes the single source of truth.

```
Backend (Fastify + Zod schemas in route options)
    -> @fastify/swagger generates OpenAPI spec at runtime
    -> Orval reads the spec
    -> Generates: React Query hooks + TypeScript types + Zod schemas
    -> Frontend imports generated code, never defines manually
```

## Architecture

### Three Blocks

1. **Backend restructuring** — split monolithic route files, co-locate schemas, migrate to Fastify route options
2. **Orval setup** — install, configure, create mutator adapter
3. **Frontend migration** — replace manual hooks/types/schemas with generated code

---

## Block 1: Backend Route Restructuring

### Directory Structure

```
apps/server/src/routes/
├── _shared/
│   ├── pagination.schema.ts        # cursorSchema, paginationQuery(defaultLimit)
│   ├── params.schema.ts            # idParam, uuidParam
│   ├── date-range.schema.ts        # dateRangeQuery (coerce.date)
│   ├── transforms.ts               # emptyToUndefined, optionalString, optionalDate, optionalEmail
│   ├── enums.schema.ts             # branchEnum, roleEnum, maritalStatusEnum, priorityEnum
│   └── response.schema.ts          # successResponse<T>, paginatedResponse<T>, errorResponse
│
├── auth/
│   ├── _schemas.ts
│   ├── auth-handler.ts
│   └── index.ts
│
├── v1/
│   ├── clients/
│   │   ├── _schemas.ts
│   │   ├── create-client.ts
│   │   ├── get-client.ts
│   │   ├── list-clients.ts
│   │   ├── update-client.ts
│   │   ├── delete-client.ts
│   │   ├── export-clients.ts
│   │   ├── import-clients.ts
│   │   └── index.ts
│   │
│   ├── proposals/
│   │   ├── _schemas.ts
│   │   ├── create-proposal.ts
│   │   ├── get-proposal.ts
│   │   ├── list-proposals.ts
│   │   ├── export-proposals.ts
│   │   ├── advance-proposal.ts
│   │   ├── mark-proposal-lost.ts
│   │   ├── reopen-proposal.ts
│   │   ├── update-proposal-details.ts
│   │   ├── generate-proposal-pdf.ts
│   │   ├── get-proposal-checklist.ts
│   │   ├── complete-checklist-item.ts
│   │   └── index.ts
│   │
│   ├── policies/
│   │   ├── _schemas.ts
│   │   ├── issue-policy.ts
│   │   ├── get-policy.ts
│   │   ├── list-policies.ts
│   │   ├── export-policies.ts
│   │   ├── cancel-policy.ts
│   │   ├── generate-policy-pdf.ts
│   │   ├── import-policies.ts
│   │   └── index.ts
│   │
│   ├── claims/
│   │   ├── _schemas.ts
│   │   ├── create-claim.ts
│   │   ├── get-claim.ts
│   │   ├── list-claims.ts
│   │   ├── update-claim-status.ts
│   │   ├── delete-claim.ts
│   │   ├── create-occurrence.ts
│   │   ├── list-occurrences.ts
│   │   └── index.ts
│   │
│   ├── commissions/
│   │   ├── _schemas.ts
│   │   ├── list-commissions.ts
│   │   ├── get-commission.ts
│   │   ├── export-commissions.ts
│   │   ├── approve-commercial.ts
│   │   ├── approve-admin.ts
│   │   ├── reject-commission.ts
│   │   ├── pay-commission.ts
│   │   ├── reverse-commission.ts
│   │   └── index.ts
│   │
│   ├── members/
│   │   ├── _schemas.ts
│   │   ├── list-members.ts
│   │   ├── change-member-role.ts
│   │   ├── deactivate-member.ts
│   │   └── index.ts
│   │
│   ├── invitations/
│   │   ├── _schemas.ts
│   │   ├── list-invitations.ts
│   │   ├── create-invitation.ts
│   │   ├── revoke-invitation.ts
│   │   └── index.ts
│   │
│   ├── organization/
│   │   ├── _schemas.ts
│   │   ├── get-organization.ts
│   │   ├── update-organization.ts
│   │   ├── upload-logo.ts
│   │   └── index.ts
│   │
│   ├── documents/
│   │   ├── _schemas.ts
│   │   ├── upload-document.ts
│   │   ├── list-documents.ts
│   │   ├── get-document-url.ts
│   │   ├── delete-document.ts
│   │   └── index.ts
│   │
│   ├── assistances/
│   │   ├── _schemas.ts
│   │   ├── create-assistance.ts
│   │   ├── get-assistance.ts
│   │   ├── list-assistances.ts
│   │   ├── update-assistance-status.ts
│   │   └── index.ts
│   │
│   ├── endorsements/
│   │   ├── _schemas.ts
│   │   ├── create-endorsement.ts
│   │   ├── list-endorsements.ts
│   │   ├── get-endorsement.ts
│   │   └── index.ts
│   │
│   ├── insurers/
│   │   ├── _schemas.ts
│   │   ├── create-insurer.ts
│   │   ├── list-insurers.ts
│   │   └── index.ts
│   │
│   ├── notifications/
│   │   ├── _schemas.ts
│   │   ├── list-notifications.ts
│   │   ├── get-unread-count.ts
│   │   ├── get-alert-counts.ts
│   │   ├── mark-read.ts
│   │   ├── mark-all-read.ts
│   │   └── index.ts
│   │
│   ├── audit-logs/
│   │   ├── _schemas.ts
│   │   ├── list-audit-logs.ts
│   │   └── index.ts
│   │
│   ├── stats/
│   │   ├── _schemas.ts
│   │   ├── get-dashboard.ts
│   │   ├── generate-report-pdf.ts
│   │   ├── stats-helpers.ts
│   │   └── index.ts
│   │
│   ├── search/
│   │   ├── _schemas.ts
│   │   ├── global-search.ts
│   │   └── index.ts
│   │
│   ├── chat/
│   │   ├── generate-token.ts
│   │   └── index.ts
│   │
│   ├── tenants/
│   │   ├── list-tenants.ts
│   │   └── index.ts
│   │
│   └── terms/
│       ├── _schemas.ts
│       ├── get-terms-status.ts
│       ├── accept-terms.ts
│       └── index.ts
│
├── internal/
│   └── leads/
│       ├── _schemas.ts
│       ├── create-lead.ts
│       └── index.ts
│
└── handle-domain-error.ts
```

### Conventions

- `_schemas.ts` — prefixed with `_` to sort first in directory, not confused with route files
- `index.ts` — Fastify plugin that registers all routes in the domain group
- Each route file exports a single function: `(app: FastifyInstance) => void`
- `_shared/` at routes root for cross-cutting schemas

### Shared Schemas (`_shared/`)

```ts
// _shared/transforms.ts
export const emptyToUndefined = z.literal('').transform(() => undefined)
export const optionalString = z.union([emptyToUndefined, z.string()]).optional()
export const optionalDate = z
  .union([emptyToUndefined, z.coerce.date()])
  .optional()
export const optionalEmail = z
  .union([emptyToUndefined, z.string().email()])
  .optional()
```

```ts
// _shared/pagination.schema.ts
export function paginationQuery(defaultLimit = 20, maxLimit = 100) {
  return z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(maxLimit).default(defaultLimit),
  })
}
```

```ts
// _shared/params.schema.ts
export const idParam = z.object({ id: z.string().min(1) })
export const uuidParam = z.object({ id: z.string().uuid() })
```

```ts
// _shared/date-range.schema.ts
export const dateRangeQuery = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})
```

```ts
// _shared/enums.schema.ts
export const branchEnum = z.enum([
  'AUTO',
  'RESIDENTIAL',
  'CONDOMINIUM',
  'BUSINESS',
  'LIFE',
  'OTHER',
])
export const roleEnum = z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'])
export const fullRoleEnum = z.enum([
  'OWNER',
  'ADMIN',
  'MANAGER',
  'COMMERCIAL',
  'VIEWER',
])
export const maritalStatusEnum = z.enum([
  'SINGLE',
  'MARRIED',
  'DIVORCED',
  'WIDOWED',
  'OTHER',
])
export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
```

```ts
// _shared/response.schema.ts
export function successResponse<T extends z.ZodType>(dataSchema: T) {
  return z.object({ success: z.literal(true), data: dataSchema })
}

export function paginatedResponse<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: z.object({ total: z.number(), nextCursor: z.string().nullable() }),
  })
}

export const errorResponse = z.object({
  success: z.literal(false),
  error: z.object({ code: z.string(), message: z.string() }),
})
```

### Route File Pattern

Each route uses Fastify route options with ZodTypeProvider instead of manual `.parse()`:

```ts
// Example: clients/create-client.ts
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { createClientBody, createClientResponse } from './_schemas'
import { requireAbility } from '@/middleware/require-ability'

export function createClientRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/clients',
    preHandler: [requireAbility('create', 'Client')],
    schema: {
      tags: ['Clients'],
      summary: 'Create a new client',
      body: createClientBody,
      response: { 201: createClientResponse },
    },
    handler: async (request, reply) => {
      // request.body is typed and validated by Fastify — no .parse()
      const useCase = container.resolve(CreateClient)
      const result = await useCase.execute({
        organizationId: request.organizationId,
        ...request.body,
      })
      return reply.status(201).send({ success: true, data: result })
    },
  })
}
```

### Domain index.ts Pattern

```ts
// clients/index.ts
import type { FastifyInstance } from 'fastify'
import { createClientRoute } from './create-client'
import { getClientRoute } from './get-client'
import { listClientsRoute } from './list-clients'
// ...

export default async function clientRoutes(app: FastifyInstance) {
  createClientRoute(app)
  getClientRoute(app)
  listClientsRoute(app)
  // ...
}
```

### OpenAPI Spec Endpoint

Activate Scalar UI (package already installed) in `app.ts`:

```ts
await app.register(import('@scalar/fastify-api-reference'), {
  routePrefix: '/api/docs',
})
```

Exposes:

- `GET /api/docs` — Scalar interactive API docs
- `GET /api/docs/json` — OpenAPI spec JSON (read by Orval)

---

## Block 2: Orval Setup

### Configuration (`apps/web/orval.config.ts`)

Two entries: one for React Query hooks, one for Zod schemas.

```ts
import { defineConfig } from 'orval'

export default defineConfig({
  // React Query hooks + TypeScript types
  bensSeguros: {
    input: {
      target: 'http://localhost:3001/api/docs/json',
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/endpoints',
      schemas: 'src/api/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      prettier: true,
      override: {
        mutator: {
          path: './src/lib/api-mutator.ts',
          name: 'customFetch',
        },
        query: {
          useQuery: true,
          useMutation: true,
          useInfinite: true,
          useInfiniteQueryParam: 'cursor',
          usePrefetch: true,
          signal: true,
          options: {
            staleTime: 60000,
          },
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },

  // Zod schemas (runtime validation)
  bensSegurosZod: {
    input: {
      target: 'http://localhost:3001/api/docs/json',
    },
    output: {
      mode: 'tags-split',
      client: 'zod',
      target: 'src/api/endpoints',
      fileExtension: '.zod.ts',
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
})
```

### Generated Output Structure

```
apps/web/src/api/
├── endpoints/
│   ├── clients/
│   │   ├── clients.ts          # useListClients, useCreateClient, useGetClient...
│   │   └── clients.zod.ts     # Zod schemas
│   ├── proposals/
│   │   ├── proposals.ts
│   │   └── proposals.zod.ts
│   └── ...
├── model/                      # All TypeScript types
│   ├── clientData.ts
│   ├── proposalData.ts
│   └── ...
└── index.ts
```

### Custom Mutator (`apps/web/src/lib/api-mutator.ts`)

Thin adapter connecting Orval-generated code to the existing `api-client.ts`:

```ts
import { api } from './api-client'

export async function customFetch<T>(config: {
  url: string
  method: string
  data?: unknown
  params?: Record<string, string>
}): Promise<T> {
  const { url, method, data, params } = config
  const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
  const path = url + queryString

  switch (method.toUpperCase()) {
    case 'GET':
      return (await api.get<T>(path)).data
    case 'POST':
      return (await api.post<T>(path, data)).data
    case 'PUT':
      return (await api.put<T>(path, data)).data
    case 'PATCH':
      return (await api.patch<T>(path, data)).data
    case 'DELETE': {
      await api.delete(path)
      return undefined as T
    }
    default:
      throw new Error(`Unsupported method: ${method}`)
  }
}
```

### Script

```json
{
  "scripts": {
    "generate:api": "orval"
  }
}
```

Run: `pnpm --filter @app/web generate:api`

---

## Block 3: Frontend Migration

### What Gets Deleted

| What                     | Count     | Location                             |
| ------------------------ | --------- | ------------------------------------ |
| Manual React Query hooks | 84        | `features/*/hooks/use-*.ts`          |
| Manual type definitions  | ~20 files | `features/*/types/index.ts`          |
| Manual Zod schemas       | 15        | `features/*/lib/schemas.ts` + inline |

### What Stays

| What                                         | Why                                         |
| -------------------------------------------- | ------------------------------------------- |
| `lib/api-client.ts`                          | Mutator uses it under the hood              |
| `lib/chat-api.ts`                            | Chat server is a separate API, out of scope |
| Socket.IO hooks                              | Real-time, not REST                         |
| Hooks with custom logic (optimistic updates) | Wrapped around generated hooks              |
| Zustand stores                               | Local state, not API-derived                |
| React Hook Form setup                        | Stays, but uses Orval-generated Zod schemas |

### Custom Hook Wrapper Pattern

For hooks that need toast notifications, cross-invalidation, or other side effects:

```ts
// features/clients/hooks/use-create-client-with-toast.ts
import { useCreateClient } from '@/api/endpoints/clients/clients'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useCreateClientWithToast() {
  const queryClient = useQueryClient()
  const mutation = useCreateClient()

  return {
    ...mutation,
    mutateAsync: async (...args: Parameters<typeof mutation.mutateAsync>) => {
      const result = await mutation.mutateAsync(...args)
      toast.success('Cliente criado com sucesso')
      void queryClient.invalidateQueries({ queryKey: ['clients'] })
      return result
    },
  }
}
```

### Form Validation — Global pt-BR Error Map

Instead of per-field Portuguese messages, configure a global Zod error map:

```ts
// apps/web/src/lib/zod-pt-br.ts
import { z } from 'zod'

z.setErrorMap((issue, ctx) => {
  const map: Record<string, string> = {
    invalid_type: 'Tipo inválido',
    too_small: `Mínimo de ${(issue as z.ZodTooSmallIssue).minimum} caracteres`,
    too_big: `Máximo de ${(issue as z.ZodTooBigIssue).maximum} caracteres`,
    invalid_string:
      issue.validation === 'email' ? 'E-mail inválido' : 'Formato inválido',
    invalid_enum_value: 'Valor não permitido',
  }
  return { message: map[issue.code] ?? ctx.defaultError }
})
```

Import once in `apps/web/src/app/layout.tsx` or providers file.

Forms then use generated Zod schemas directly:

```ts
import { createClientBody } from '@/api/endpoints/clients/clients.zod'

const form = useForm({
  resolver: zodResolver(createClientBody),
})
```

---

## Out of Scope

- **Chat server** — separate API (Socket.IO + REST on port 3002), different Orval config in the future
- **`packages/core`** — domain logic unchanged
- **Database** — no schema changes
- **New features** — purely infrastructure/DX improvement

## Dev Workflow After Implementation

1. Change schema or route in backend
2. Run `pnpm --filter @app/web generate:api`
3. Hooks, types, and Zod schemas are regenerated
4. Commit generated files alongside backend changes
