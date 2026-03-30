# Orval Response Schemas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add exact response schemas to all backend routes so Orval generates fully typed hooks, eliminating manual types and Zod schemas on the frontend.

**Architecture:** Define `dataSchema` in each domain's `_schemas.ts`, wire into `schema.response` on routes, regenerate Orval, then migrate frontend to use generated code — deleting manual types, hooks wrappers, and form schemas.

**Tech Stack:** Zod (backend schemas), Fastify ZodTypeProvider (serialization), Orval (code generation), TanStack React Query (frontend hooks)

**Spec:** `docs/superpowers/specs/2026-03-30-orval-response-schemas-design.md`

---

## Task 1: Response schemas — Clients

**Files:**

- Modify: `apps/server/src/routes/v1/clients/_schemas.ts`
- Modify: `apps/server/src/routes/v1/clients/create-client.ts`
- Modify: `apps/server/src/routes/v1/clients/get-client.ts`
- Modify: `apps/server/src/routes/v1/clients/list-clients.ts`
- Modify: `apps/server/src/routes/v1/clients/update-client.ts`
- Modify: `apps/server/src/routes/v1/clients/delete-client.ts`

- [ ] **Step 1: Read current handler responses**

Read every route file in `clients/` to see what `reply.send()` returns. Also read the `ClientPresenter` class from `@repo/core` — the list and detail handlers use it to mask/transform data.

- [ ] **Step 2: Define response schemas in `_schemas.ts`**

Add data schemas that match the exact handler response shapes. For clients, the list returns masked documents (3 first + 3 last chars), the detail returns full data. Use the existing `clientListItem` and `clientDetailData` schemas if they exist, or create new ones.

The response schema must include ALL fields the handler returns, including joined/computed fields. Use `successResponse()` and `paginatedResponse()` from `_shared/response.schema.ts`.

- [ ] **Step 3: Wire `schema.response` into each route**

Add `response: { 200: paginatedResponse(clientListItem) }` (or appropriate status + schema) to each route's `schema` block. For mutations that return `{ success: true, data: ... }`, use `successResponse(clientData)`. For DELETE that returns 204, use `z.void()` or omit.

- [ ] **Step 4: Verify typecheck**

Run: `pnpm --filter @app/server exec tsc --noEmit`

If the serializer type conflicts with the handler return type, adjust the schema to match exactly what the handler returns. Common issues: nullable fields missing `.nullable()`, Date fields needing `z.coerce.date()`, nested objects needing their own schema.

- [ ] **Step 5: Verify server starts and routes work**

Start server: `pnpm --filter @app/server dev`
Test: `curl -s http://localhost:3001/api/docs/openapi.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d['paths']['/api/v1/clients']['get']['responses'], indent=2))" | head -20`

Verify the OpenAPI spec now includes response schema definitions for client routes.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(server): add response schemas to client routes"
```

---

## Task 2: Response schemas — Proposals

**Files:**

- Modify: `apps/server/src/routes/v1/proposals/_schemas.ts`
- Modify: All route files in `proposals/`

Same pattern as Task 1. Proposals are the most complex domain — the response includes:

- `InsuredObjectDetails` discriminated union (6 branch types: AUTO, RESIDENTIAL, CONDOMINIUM, BUSINESS, LIFE, OTHER)
- Checklist items with summary
- Joined fields: `clientName`, `insurerName`

- [ ] **Step 1:** Read all proposal route handlers + the existing `insuredObjectDetailsSchema` in `_schemas.ts`
- [ ] **Step 2:** Define `proposalListItem`, `proposalDetail`, `checklistResponse` schemas
- [ ] **Step 3:** Wire `schema.response` into each route (11 routes)
- [ ] **Step 4:** Verify: `pnpm --filter @app/server exec tsc --noEmit`
- [ ] **Step 5:** Commit

---

## Task 3: Response schemas — Policies

**Files:**

- Modify: `apps/server/src/routes/v1/policies/_schemas.ts`
- Modify: All route files in `policies/`

Policies include: coverageDetails (arbitrary JSON), cancellation fields, PDF response.

- [ ] **Step 1:** Read all policy route handlers
- [ ] **Step 2:** Define `policyListItem`, `policyDetail`, `pdfResponse` schemas
- [ ] **Step 3:** Wire `schema.response` into each route
- [ ] **Step 4:** Verify typecheck
- [ ] **Step 5:** Commit

---

## Task 4: Response schemas — Claims + Occurrences

**Files:**

- Modify: `apps/server/src/routes/v1/claims/_schemas.ts`
- Modify: All route files in `claims/`

Claims include: occurrences as nested array, assignment info, incident details.

- [ ] **Step 1:** Read all claim route handlers
- [ ] **Step 2:** Define `claimListItem`, `claimDetail`, `occurrenceData` schemas
- [ ] **Step 3:** Wire `schema.response` into each route (7 routes)
- [ ] **Step 4:** Verify typecheck
- [ ] **Step 5:** Commit

---

## Task 5: Response schemas — Commissions

**Files:**

- Modify: `apps/server/src/routes/v1/commissions/_schemas.ts`
- Modify: All route files in `commissions/`

Commissions include: lifecycle fields (approval, payment, rejection), salesperson join, reversal flag.

- [ ] **Step 1:** Read all commission route handlers
- [ ] **Step 2:** Define `commissionListItem`, `commissionDetail` schemas
- [ ] **Step 3:** Wire `schema.response` into each route (8 routes)
- [ ] **Step 4:** Verify typecheck
- [ ] **Step 5:** Commit

---

## Task 6: Response schemas — Remaining domains (batch)

**Files:**

- Modify: `_schemas.ts` and route files in: `endorsements/`, `assistances/`, `documents/`, `insurers/`, `members/`, `invitations/`, `organization/`, `notifications/`, `audit-logs/`, `search/`, `stats/`, `tenants/`, `terms/`, `internal/leads/`

These are simpler domains. For each:

- Read the handler response shape
- Define data schema in `_schemas.ts`
- Wire `schema.response` into routes

Notable complexities:

- **Stats**: `buildDashboardData()` returns a complex aggregation object — read `stats-helpers.ts` carefully
- **Search**: returns multi-entity grouped results `{ clients, proposals, policies, claims }`
- **Organization**: logo is a signed URL string
- **Members**: inline Prisma query with user join
- **Notifications**: alertCounts has entity-type grouping

- [ ] **Step 1-14:** Add response schemas to each domain (one at a time, verify typecheck after each)
- [ ] **Step 15:** Final verify: `pnpm --filter @app/server exec tsc --noEmit`
- [ ] **Step 16:** Commit per domain group

---

## Task 7: Quality gate + regenerate Orval

- [ ] **Step 1:** Run all quality gates

```bash
pnpm typecheck
pnpm lint
pnpm test
```

- [ ] **Step 2:** Start server and regenerate Orval

```bash
pnpm --filter @app/server dev &
sleep 7
pnpm --filter @app/web generate:api
rm -rf apps/web/src/api/endpoints/default/
```

- [ ] **Step 3:** Verify generated types are no longer `void`

Check that generated model files now have actual field definitions:

```bash
cat apps/web/src/api/model/listClients200DataItem.ts
# Should show: name: string, document: string, type: ..., etc.
```

- [ ] **Step 4:** Verify typecheck with new generated code

```bash
pnpm --filter @app/web exec tsc --noEmit
```

- [ ] **Step 5:** Commit

```bash
git commit -m "feat(web): regenerate Orval with full response types"
```

---

## Task 8: Migrate frontend hooks to use Orval directly

**Files:**

- Modify: All hook files in `apps/web/src/features/*/hooks/`

For each domain's hook file:

1. **Query hooks**: Replace manual `useQuery` + `api.get` with Orval-generated hooks directly
2. **Mutation hooks**: Keep as thin wrappers that add toast + cache invalidation via Orval hook options

Pattern for queries:

```ts
// BEFORE
export function useClients(filters: ClientFilters) {
  return useQuery({
    queryKey: getListClientsQueryKey(),
    queryFn: () => api.get<ClientData[]>(getListClientsUrl() + '?...'),
  })
}

// AFTER
import { useListClients } from '@/api/endpoints/clients/clients'
export function useClients(filters: ListClientsParams) {
  return useListClients(filters)
}
```

Pattern for mutations:

```ts
// AFTER
import {
  useCreateClient,
  getListClientsQueryKey,
} from '@/api/endpoints/clients/clients'
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

- [ ] **Step 1-13:** Migrate each domain's hooks (clients, proposals, policies, claims, commissions, assistances, endorsements, documents, notifications, members, organization, dashboard, audit/terms)
- [ ] **Step 14:** Verify: `pnpm --filter @app/web exec tsc --noEmit`
- [ ] **Step 15:** Commit

---

## Task 9: Delete manual types + move UI constants

**Files:**

- Delete: 14 type files in `apps/web/src/features/*/types/`
- Create: `apps/web/src/features/*/lib/constants.ts` (where UI constants exist)
- Modify: All components importing from deleted type files

For each `features/*/types/index.ts`:

1. Check if it has UI constants (labels, badge variants, arrays). If yes, move to `features/*/lib/constants.ts` with types imported from `@/api/model`
2. Delete the type file
3. Update all component imports: data types → `@/api/model`, constants → `../lib/constants`

- [ ] **Step 1:** Extract constants from `proposals/types/index.ts` → `proposals/lib/constants.ts` (STAGE_LABELS, BRANCH_LABELS, BADGE_VARIANTS, etc.)
- [ ] **Step 2:** Extract constants from `policies/types/index.ts` → `policies/lib/constants.ts`
- [ ] **Step 3:** Extract constants from `commissions/types/index.ts` → `commissions/lib/constants.ts`
- [ ] **Step 4-13:** Handle remaining type files (some have no constants — just delete and update imports)
- [ ] **Step 14:** Verify: `pnpm --filter @app/web exec tsc --noEmit`
- [ ] **Step 15:** Commit

---

## Task 10: Migrate form Zod schemas

**Files:**

- Delete: `apps/web/src/features/clients/lib/schemas.ts`
- Delete: `apps/web/src/features/claims/lib/schemas.ts`
- Delete: `apps/web/src/features/assistances/lib/schemas.ts`
- Delete: `apps/web/src/features/members/lib/member-schemas.ts`
- Modify: 5 component files with inline schemas

For dedicated schema files: delete and update form components to import from generated `.zod.ts`.

For inline schemas in components: replace with generated schema import.

```ts
// Component BEFORE
const proposalFormSchema = z.object({ ... })
const form = useForm({ resolver: zodResolver(proposalFormSchema) })

// Component AFTER
import { createProposalBody } from '@/api/endpoints/proposals/proposals.zod'
const form = useForm({ resolver: zodResolver(createProposalBody) })
```

Components to update:

- `features/organization/components/organization-form.tsx` → `updateOrganizationBody`
- `features/proposals/components/proposal-form.tsx` → `createProposalBody`
- `features/proposals/components/issue-policy-sheet.tsx` → `issuePolicyBody`
- `features/endorsements/components/endorsement-form.tsx` → `createEndorsementBody`
- `features/claims/components/occurrence-form.tsx` → `createClaimOccurrenceBody`

Keep untouched (out of scope): `login-form.tsx`, `register-form.tsx`, `create-org-form.tsx`

Note: If a form schema has fields not in the API schema (e.g., `confirmPassword` in register), it stays manual.

- [ ] **Step 1-4:** Delete dedicated schema files, update imports
- [ ] **Step 5-9:** Replace inline schemas in components
- [ ] **Step 10:** Verify: `pnpm --filter @app/web exec tsc --noEmit`
- [ ] **Step 11:** Commit

---

## Task 11: Final quality gates + code review + QA

- [ ] **Step 1:** Full quality gates

```bash
pnpm typecheck   # 6/6
pnpm lint        # 2/2
pnpm test        # 168/168
```

- [ ] **Step 2:** Verify no manual types remain

```bash
# Should return only chat/auth/org types (out of scope)
find apps/web/src/features -name "types" -type d
```

- [ ] **Step 3:** Verify no manual Zod schemas remain

```bash
# Should return only channels/ai-agents schemas (chat API, out of scope)
find apps/web/src/features -name "schemas.ts" -o -name "member-schemas.ts" | grep -v node_modules
```

- [ ] **Step 4:** Code review (dispatch `superpowers:requesting-code-review`)
- [ ] **Step 5:** QA with Playwright — test Scalar docs, login, key flows
- [ ] **Step 6:** Create PR
