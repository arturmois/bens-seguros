# Orval Response Schemas — Backend as Single Source of Truth

**Date:** 2026-03-30
**Status:** Approved
**Depends on:** PR #36 (merged) — Orval + OpenAPI integration

## Problem

PR #36 set up Orval code generation but routes lack `schema.response` definitions. This means:

- Orval generates `void` response types — hooks are unusable for queries
- 14 manual type files (`features/*/types/index.ts`) still needed
- 26 hook wrappers use `api.get` manually instead of Orval hooks
- 15 Zod schemas duplicated between frontend and backend
- UI constants (labels, badge variants) mixed with data types

## Solution

Add exact response schemas to all backend routes. Regenerate Orval. Migrate frontend to use generated types, hooks, and Zod schemas exclusively. Backend becomes the single source of truth.

## Architecture

```
Backend routes define response schemas
    -> @fastify/swagger includes them in OpenAPI spec
    -> Orval generates: typed hooks + response types + Zod schemas
    -> Frontend uses generated code directly
    -> Manual types/schemas deleted
```

---

## Block 1: Response Schemas on Backend

### For each of the 18 domains, define data schemas in `_schemas.ts`

**Pattern:**

```ts
// routes/v1/clients/_schemas.ts

// Data schema — exact fields the handler returns
export const clientData = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  document: z.string(),
  type: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  birthDate: z.coerce.date().nullable(),
  profession: z.string().nullable(),
  maritalStatus: maritalStatusEnum.nullable(),
  tags: z.array(z.string()),
  consentLgpd: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

// List item may differ from detail (fewer fields, includes computed/joined data)
export const clientListItem = clientData.pick({
  id: true,
  name: true,
  document: true,
  type: true,
  email: true,
  phone: true,
  createdAt: true,
})
```

**Wiring into routes:**

```ts
// routes/v1/clients/list-clients.ts
schema: {
  response: {
    200: paginatedResponse(clientListItem),
  },
}

// routes/v1/clients/get-client.ts
schema: {
  response: {
    200: successResponse(clientData),
  },
}
```

### Schema design principles

- **Exact schemas, not passthrough.** Each response schema lists exactly the fields the handler returns. No `.passthrough()`. This prevents data leaks and ensures Orval generates complete types.
- **Separate list vs detail schemas** where the shapes differ (e.g., list item has `clientName` string, detail has full nested `client` object).
- **Include relationship fields.** If a handler returns `clientName` from a JOIN, include it in the schema. The schema reflects the API contract, not the database model.
- **Use shared `successResponse()` and `paginatedResponse()` wrappers** from `_shared/response.schema.ts` for consistency.

### Domains and estimated response schemas

| Domain        | List                 | Detail                   | Actions                                                      | Total   |
| ------------- | -------------------- | ------------------------ | ------------------------------------------------------------ | ------- |
| Clients       | listItem + paginated | detail                   | create, update, delete                                       | 5       |
| Proposals     | listItem + paginated | detail                   | create, advance, lost, reopen, updateDetails, pdf, checklist | 8       |
| Policies      | listItem + paginated | detail                   | issue, cancel, pdf                                           | 5       |
| Claims        | listItem + paginated | detail                   | create, updateStatus, delete, occurrence                     | 6       |
| Commissions   | listItem + paginated | detail                   | approve, reject, pay, reverse                                | 5       |
| Endorsements  | listItem + paginated | detail                   | create                                                       | 3       |
| Assistances   | listItem + paginated | detail                   | create, updateStatus                                         | 4       |
| Documents     | listItem             | url                      | upload, delete                                               | 3       |
| Insurers      | listItem + paginated | —                        | create                                                       | 2       |
| Members       | listItem + paginated | —                        | updateRole, deactivate                                       | 2       |
| Invitations   | listItem + paginated | —                        | create, revoke                                               | 2       |
| Organization  | detail               | —                        | update, uploadLogo                                           | 2       |
| Notifications | listItem + paginated | unreadCount, alertCounts | markRead                                                     | 3       |
| Audit Logs    | listItem + paginated | —                        | —                                                            | 1       |
| Search        | results              | —                        | —                                                            | 1       |
| Stats         | dashboard            | —                        | pdf                                                          | 2       |
| Tenants       | listItem             | —                        | —                                                            | 1       |
| Terms         | status               | —                        | accept                                                       | 2       |
| **Total**     |                      |                          |                                                              | **~57** |

---

## Block 2: Regenerate Orval

After all response schemas are added:

```bash
# Start server
pnpm --filter @app/server dev

# Regenerate
pnpm --filter @app/web generate:api

# Delete default/ directory (wildcard route syntax error)
rm -rf apps/web/src/api/endpoints/default/
```

The generated output will now have:

- **Typed response types** in `api/model/` (e.g., `ClientData`, `ProposalListItem`, `DashboardStats`)
- **Typed hooks** that return actual data, not `void`
- **Typed Zod schemas** for request validation in `.zod.ts` files

---

## Block 3: Migrate Frontend Hooks

### Query hooks — use Orval directly

```ts
// BEFORE: manual api.get wrapper
export function useClients(filters: ClientFilters) {
  return useQuery({
    queryKey: getListClientsQueryKey(),
    queryFn: () => api.get<ClientData[]>(getListClientsUrl() + '?...'),
  })
}

// AFTER: Orval hook directly
export function useClients(filters: ListClientsParams) {
  return useListClients(filters)
}
```

### Mutation hooks — thin wrapper with toast

```ts
// BEFORE: manual fetch + toast
export function useCreateClient() {
  return useMutation({
    mutationFn: (data) => createClient(data),
    onSuccess: () => {
      toast.success('...')
      invalidate()
    },
  })
}

// AFTER: Orval hook + callbacks
export function useCreateClientWithToast() {
  const qc = useQueryClient()
  return useCreateClient({
    mutation: {
      onSuccess: () => {
        toast.success('Cliente criado com sucesso')
        qc.invalidateQueries({ queryKey: getListClientsQueryKey() })
      },
      onError: () => toast.error('Erro ao criar cliente'),
    },
  })
}
```

### Hooks that stay manual

- Socket.IO hooks (`features/chat/hooks/`) — real-time, not REST
- Auth hooks (`features/auth/hooks/use-auth.ts`) — Better Auth integration
- Org hooks (`features/org/hooks/use-orgs.ts`) — custom fetch, tenant switching
- Chat API hooks (`features/channels/`, `features/ai-agents/`) — separate API (port 3002)
- Kanban infinite query (`use-kanban-proposals.ts`) — `useInfiniteQuery` not generated

---

## Block 4: Delete Manual Types + Move Constants

### For each `features/*/types/index.ts`:

1. Extract UI constants (labels, badge variants, arrays) to `features/*/lib/constants.ts`
2. Delete the type file
3. Update all imports:
   - Data types → `@/api/model`
   - Constants → `../lib/constants`

### Files to delete (14 type files):

- `features/assistances/types/index.ts`
- `features/audit/types/index.ts`
- `features/claims/types/index.ts`
- `features/clients/types/index.ts`
- `features/clients/types/import-types.ts`
- `features/commissions/types/index.ts`
- `features/dashboard/types/index.ts`
- `features/documents/types/index.ts`
- `features/endorsements/types/index.ts`
- `features/notifications/types/index.ts`
- `features/policies/types/index.ts`
- `features/proposals/types/index.ts`
- `features/channels/types/index.ts` (only data types, keep channel-specific)
- `features/chat/types/index.ts` (keep — chat API not in scope)

### Constants to extract (examples):

```ts
// features/proposals/lib/constants.ts
import type { ProposalStage, InsuranceBranch } from '@/api/model'

export const STAGE_LABELS: Record<ProposalStage, string> = {
  CAPTURE: 'Captação',
  QUOTE: 'Cotação',
  // ...
}

export const STAGE_BADGE_VARIANT: Record<ProposalStage, string> = { ... }
export const BRANCHES: InsuranceBranch[] = [...]
```

---

## Block 5: Migrate Form Zod Schemas

### Dedicated schema files → delete

| File                                     | Replaced by                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `features/clients/lib/schemas.ts`        | `api/endpoints/clients/clients.zod.ts` → `createClientBody`             |
| `features/claims/lib/schemas.ts`         | `api/endpoints/claims/claims.zod.ts` → `createClaimBody`                |
| `features/assistances/lib/schemas.ts`    | `api/endpoints/assistances/assistances.zod.ts` → `createAssistanceBody` |
| `features/members/lib/member-schemas.ts` | `api/endpoints/invitations/invitations.zod.ts` → `createInvitationBody` |

### Inline schemas in components → replace import

```ts
// BEFORE (inline in component)
const proposalFormSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  branch: z.string().min(1, 'Ramo é obrigatório'),
})

// AFTER
import { createProposalBody } from '@/api/endpoints/proposals/proposals.zod'

const form = useForm({
  resolver: zodResolver(createProposalBody),
})
```

Components affected (7 with inline schemas):

- `features/auth/components/login-form.tsx` — keep (auth not in Orval scope)
- `features/auth/components/register-form.tsx` — keep (auth not in Orval scope)
- `features/org/components/create-org-form.tsx` — keep (org not in Orval scope)
- `features/organization/components/organization-form.tsx` — replace with `updateOrganizationBody`
- `features/proposals/components/proposal-form.tsx` — replace with `createProposalBody`
- `features/proposals/components/issue-policy-sheet.tsx` — replace with `issuePolicyBody`
- `features/endorsements/components/endorsement-form.tsx` — replace with `createEndorsementBody`
- `features/claims/components/occurrence-form.tsx` — replace with `createClaimOccurrenceBody`

Note: The global pt-BR Zod error map (already configured) provides Portuguese validation messages for all generated schemas automatically.

---

## Out of Scope

- Chat server API (port 3002) — separate Orval config in the future
- Auth/org forms — Better Auth, not standard REST
- Socket.IO hooks
- New features

## Dev Workflow After Implementation

1. Change route or schema in backend
2. Run `pnpm --filter @app/web generate:api`
3. Types + hooks + Zod schemas regenerated
4. If field added → frontend has typed access immediately
5. If field removed → TypeScript errors in consuming components → fix
6. Commit backend + generated frontend together
