# Global Search (Cmd+K) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a unified Cmd+K command palette that searches clients, proposals, policies, and claims in a single query, with quick-action shortcuts when input is empty.

**Architecture:** Backend `GET /api/v1/search?q=...` runs 4 parallel Prisma queries scoped by `organizationId`. Frontend uses `useGlobalSearch` hook (React Query + debounce) feeding into a `CommandPalette` component built on existing `@/components/ui/command` (base-ui Autocomplete, NOT cmdk).

**Tech Stack:** Fastify 5, Prisma (ILIKE), Zod, React 19, TanStack React Query, base-ui Autocomplete (via `@/components/ui/command`), Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-25-global-search-design.md`

---

## File Structure

```
apps/server/src/schemas/search.schemas.ts          # NEW: Zod schemas for search endpoint
apps/server/src/routes/v1/search-routes.ts          # NEW: route + handler + registration
apps/server/src/app.ts                              # MODIFY: register searchRoutes
apps/server/src/container-registrations.ts           # No change (search queries raw Prisma, no use case)
apps/web/src/components/shared/command-palette.types.ts  # NEW: result type interfaces
apps/web/src/hooks/use-global-search.ts             # NEW: React Query + debounce hook
apps/web/src/components/shared/command-palette.tsx   # NEW: main palette component (<200 lines)
apps/web/src/components/layout/app-shell.tsx         # MODIFY: mount <CommandPalette />
```

---

## Important Schema Notes

- **Proposal has no `proposalNumber` field.** Search proposals by `client.name` (join) and `branch`. Return `id`, `stage`, `branch`, `clientName`.
- **Claim `claimNumber` is `Int`, not String.** For numeric queries, parse to int and match `claimNumber` exactly. For text queries, search `client.name` (join).
- **Policy `policyNumber` is `String`.** Search via ILIKE.
- **Client `document`:** strip non-digits before matching for CPF/CNPJ support.

---

## Task 1: Backend — Search schemas and route

**Context:** Create the `GET /api/v1/search?q={query}&limit={number}` endpoint. Since this is a cross-module read-only query, implement directly in the route handler using raw Prisma queries (no use case class needed — this is a read query aggregation, not domain logic). Follows the same pattern as `stats-routes.ts`.

**Files:**

- New: `apps/server/src/schemas/search.schemas.ts`
- New: `apps/server/src/routes/v1/search-routes.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Create search schemas**

Create `apps/server/src/schemas/search.schemas.ts`:

```typescript
import { z } from 'zod'

export const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>
```

- [ ] **Step 2: Create search route**

Create `apps/server/src/routes/v1/search-routes.ts`:

```typescript
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '@repo/db'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { searchQuerySchema } from '../../schemas/search.schemas.js'

function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export async function searchRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  app.get(
    '/api/v1/search',
    { preHandler: [requireAbility('read', 'all')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { q, limit } = searchQuerySchema.parse(request.query)
      const organizationId = request.organizationId!
      const perEntity = Math.ceil(limit / 4)
      const searchPattern = `%${q}%`
      const documentQuery = stripNonDigits(q)
      const documentPattern =
        documentQuery.length >= 2 ? `%${documentQuery}%` : null
      const numericQuery = Number.parseInt(q, 10)
      const isNumeric = !Number.isNaN(numericQuery)

      const [clients, proposals, policies, claims] = await Promise.all([
        // Clients: search name, email, document
        prisma.client.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              ...(documentPattern
                ? [
                    {
                      document: {
                        contains: documentQuery,
                        mode: 'insensitive' as const,
                      },
                    },
                  ]
                : []),
            ],
          },
          select: { id: true, name: true, document: true, type: true },
          take: perEntity,
          orderBy: { name: 'asc' },
        }),

        // Proposals: search by client name (join)
        prisma.proposal.findMany({
          where: {
            organizationId,
            deletedAt: null,
            client: {
              name: { contains: q, mode: 'insensitive' },
              deletedAt: null,
            },
          },
          select: {
            id: true,
            stage: true,
            branch: true,
            client: { select: { name: true } },
          },
          take: perEntity,
          orderBy: { createdAt: 'desc' },
        }),

        // Policies: search policyNumber, client name (join)
        prisma.policy.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { policyNumber: { contains: q, mode: 'insensitive' } },
              {
                client: {
                  name: { contains: q, mode: 'insensitive' },
                  deletedAt: null,
                },
              },
            ],
          },
          select: {
            id: true,
            policyNumber: true,
            branch: true,
            client: { select: { name: true } },
          },
          take: perEntity,
          orderBy: { createdAt: 'desc' },
        }),

        // Claims: search claimNumber (exact int), client name (join), policy number (join)
        prisma.claim.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              ...(isNumeric ? [{ claimNumber: numericQuery }] : []),
              {
                client: {
                  name: { contains: q, mode: 'insensitive' },
                  deletedAt: null,
                },
              },
              {
                policy: {
                  policyNumber: { contains: q, mode: 'insensitive' },
                  deletedAt: null,
                },
              },
            ],
          },
          select: {
            id: true,
            claimNumber: true,
            status: true,
            client: { select: { name: true } },
          },
          take: perEntity,
          orderBy: { createdAt: 'desc' },
        }),
      ])

      const data = {
        clients: clients.map((c) => ({
          id: c.id,
          name: c.name,
          document: c.document,
          type: c.type,
        })),
        proposals: proposals.map((p) => ({
          id: p.id,
          stage: p.stage,
          branch: p.branch,
          clientName: p.client.name,
        })),
        policies: policies.map((p) => ({
          id: p.id,
          policyNumber: p.policyNumber,
          branch: p.branch,
          clientName: p.client.name,
        })),
        claims: claims.map((c) => ({
          id: c.id,
          claimNumber: c.claimNumber,
          status: c.status,
          clientName: c.client.name,
        })),
      }

      const totalResults =
        data.clients.length +
        data.proposals.length +
        data.policies.length +
        data.claims.length

      return reply.send({
        success: true,
        data,
        meta: { query: q, totalResults },
      })
    }
  )
}
```

- [ ] **Step 3: Register search route in app.ts**

In `apps/server/src/app.ts`, add the import:

```typescript
import { searchRoutes } from './routes/v1/search-routes.js'
```

Add inside the `authenticatedApp.register` block (after `notificationRoutes`):

```typescript
await authenticatedApp.register(searchRoutes)
```

- [ ] **Step 4: Verify typecheck**

```bash
cd /home/artur/projects && pnpm typecheck --filter server
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/schemas/search.schemas.ts apps/server/src/routes/v1/search-routes.ts apps/server/src/app.ts
git commit -m "feat(server): add global search endpoint GET /api/v1/search"
```

---

## Task 2: Frontend — Search result types

**Context:** Define shared TypeScript interfaces for the search response. These are used by the hook and the component.

**Files:**

- New: `apps/web/src/components/shared/command-palette.types.ts`

- [ ] **Step 1: Create types file**

Create `apps/web/src/components/shared/command-palette.types.ts`:

```typescript
interface ClientSearchResult {
  readonly id: string
  readonly name: string
  readonly document: string
  readonly type: 'PF' | 'PJ' | 'LEAD'
}

interface ProposalSearchResult {
  readonly id: string
  readonly stage: string
  readonly branch: string
  readonly clientName: string
}

interface PolicySearchResult {
  readonly id: string
  readonly policyNumber: string
  readonly branch: string
  readonly clientName: string
}

interface ClaimSearchResult {
  readonly id: string
  readonly claimNumber: number
  readonly status: string
  readonly clientName: string
}

export interface GlobalSearchResults {
  readonly clients: readonly ClientSearchResult[]
  readonly proposals: readonly ProposalSearchResult[]
  readonly policies: readonly PolicySearchResult[]
  readonly claims: readonly ClaimSearchResult[]
}

export interface GlobalSearchMeta {
  readonly query: string
  readonly totalResults: number
}

export interface GlobalSearchResponse {
  readonly success: true
  readonly data: GlobalSearchResults
  readonly meta: GlobalSearchMeta
}
```

Note: `type` includes `'LEAD'` because the `ClientType` enum in the Prisma schema includes LEAD. `claimNumber` is `number` (not string) matching the DB `Int` type.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/shared/command-palette.types.ts
git commit -m "feat(web): add global search result type definitions"
```

---

## Task 3: Frontend — useGlobalSearch hook

**Context:** React Query hook that debounces the query (300ms), skips fetch for <2 chars, and calls `GET /api/v1/search?q=...`. Uses existing `useDebounce` from `@/hooks/use-debounce` and `api` client from `@/lib/api-client`.

**Files:**

- New: `apps/web/src/hooks/use-global-search.ts`

- [ ] **Step 1: Create the hook**

Create `apps/web/src/hooks/use-global-search.ts`:

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type {
  GlobalSearchResults,
  GlobalSearchResponse,
} from '@/components/shared/command-palette.types'
import { useDebounce } from './use-debounce'

const GLOBAL_SEARCH_KEY = 'global-search'
const MIN_QUERY_LENGTH = 2
const DEFAULT_DEBOUNCE_MS = 300
const DEFAULT_LIMIT = 10

interface UseGlobalSearchOptions {
  readonly debounceMs?: number
  readonly limit?: number
}

export function useGlobalSearch(
  query: string,
  options?: UseGlobalSearchOptions
) {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const limit = options?.limit ?? DEFAULT_LIMIT
  const debouncedQuery = useDebounce(query.trim(), debounceMs)
  const enabled = debouncedQuery.length >= MIN_QUERY_LENGTH

  const { data, isLoading } = useQuery<GlobalSearchResults>({
    queryKey: [GLOBAL_SEARCH_KEY, debouncedQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: String(limit),
      })
      const response = await api.get<GlobalSearchResults>(
        `/api/v1/search?${params.toString()}`
      )
      return response.data
    },
    enabled,
    staleTime: 30_000,
    gcTime: 60_000,
  })

  const totalResults = data
    ? data.clients.length +
      data.proposals.length +
      data.policies.length +
      data.claims.length
    : 0

  return {
    results: data,
    isLoading: enabled && isLoading,
    totalResults,
  } as const
}
```

- [ ] **Step 2: Verify typecheck**

```bash
cd /home/artur/projects && pnpm typecheck --filter web
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-global-search.ts
git commit -m "feat(web): add useGlobalSearch hook with debounce and React Query"
```

---

## Task 4: Frontend — CommandPalette component

**Context:** The main component. Uses existing command.tsx primitives (CommandDialog, CommandDialogPopup, Command, CommandInput, CommandList, CommandGroup, CommandGroupLabel, CommandItem, CommandPanel, CommandEmpty, CommandFooter). Extracts `QuickActionsGroup` and `SearchResultsGroups` as sub-components to stay under 200 lines. Registers global Cmd+K / Ctrl+K keydown listener.

**Important:** The `Command` component wraps base-ui `Autocomplete` (always open, inline mode). The `CommandInput` renders an `AutocompleteInput`. Value tracking uses a standard React `useState` + `onChange` on the input. Navigation on select uses `router.push()`.

**Files:**

- New: `apps/web/src/components/shared/command-palette.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/shared/command-palette.tsx`:

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FilePlus,
  LayoutDashboard,
  Search,
  Settings,
  UserPlus,
  Users,
  FileText,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import {
  CommandDialog,
  CommandDialogPopup,
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandGroupLabel,
  CommandItem,
  CommandPanel,
  CommandEmpty,
  CommandFooter,
} from '@/components/ui/command'
import { useGlobalSearch } from '@/hooks/use-global-search'
import type { GlobalSearchResults } from './command-palette.types'

const QUICK_ACTIONS = [
  { label: 'Novo Cliente', icon: UserPlus, route: '/clients/new' },
  { label: 'Nova Proposta', icon: FilePlus, route: '/proposals/new' },
  { label: 'Dashboard', icon: LayoutDashboard, route: '/' },
  { label: 'Configurações', icon: Settings, route: '/settings' },
] as const

const ENTITY_CONFIG = {
  clients: { label: 'Clientes', icon: Users, prefix: '/clients' },
  proposals: { label: 'Propostas', icon: FileText, prefix: '/proposals' },
  policies: { label: 'Apólices', icon: Shield, prefix: '/policies' },
  claims: { label: 'Sinistros', icon: AlertTriangle, prefix: '/claims' },
} as const

type EntityKey = keyof typeof ENTITY_CONFIG

function QuickActionsGroup({
  onSelect,
}: {
  onSelect: (route: string) => void
}) {
  return (
    <CommandGroup>
      <CommandGroupLabel>Ações rápidas</CommandGroupLabel>
      {QUICK_ACTIONS.map((action) => (
        <CommandItem
          key={action.route}
          onSelect={() => onSelect(action.route)}
          value={action.label}
        >
          <action.icon className="mr-2 size-4 shrink-0" />
          {action.label}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

function getResultLabel(key: EntityKey, item: Record<string, unknown>): string {
  if (key === 'clients') return item.name as string
  if (key === 'proposals') return `${item.branch} — ${item.clientName}`
  if (key === 'policies') return `${item.policyNumber} — ${item.clientName}`
  return `#${item.claimNumber} — ${item.clientName}`
}

function SearchResultsGroups({
  results,
  onSelect,
}: {
  results: GlobalSearchResults
  onSelect: (route: string) => void
}) {
  const entityKeys = Object.keys(ENTITY_CONFIG) as readonly EntityKey[]

  return (
    <>
      {entityKeys.map((key) => {
        const items = results[key]
        if (items.length === 0) return null
        const config = ENTITY_CONFIG[key]
        const Icon = config.icon

        return (
          <CommandGroup key={key}>
            <CommandGroupLabel>{config.label}</CommandGroupLabel>
            {items.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => onSelect(`${config.prefix}/${item.id}`)}
                value={`${config.label} ${getResultLabel(key, item as unknown as Record<string, unknown>)}`}
              >
                <Icon className="mr-2 size-4 shrink-0" />
                <span className="truncate">
                  {getResultLabel(
                    key,
                    item as unknown as Record<string, unknown>
                  )}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )
      })}
    </>
  )
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const { results, isLoading } = useGlobalSearch(query)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelect = useCallback(
    (route: string) => {
      setOpen(false)
      setQuery('')
      router.push(route)
    },
    [router]
  )

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setQuery('')
  }, [])

  const hasQuery = query.trim().length > 0
  const hasResults =
    results &&
    (results.clients.length > 0 ||
      results.proposals.length > 0 ||
      results.policies.length > 0 ||
      results.claims.length > 0)

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandDialogPopup>
        <Command>
          <CommandInput
            placeholder="Buscar clientes, propostas, apólices..."
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
          <CommandPanel>
            <CommandList>
              {!hasQuery && <QuickActionsGroup onSelect={handleSelect} />}
              {hasQuery && results && (
                <SearchResultsGroups
                  results={results}
                  onSelect={handleSelect}
                />
              )}
              {hasQuery && !isLoading && !hasResults && (
                <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
              )}
              {hasQuery && isLoading && (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  Buscando...
                </div>
              )}
            </CommandList>
          </CommandPanel>
          <CommandFooter>
            <div className="flex gap-4">
              <span>↑↓ navegar</span>
              <span>↵ abrir</span>
              <span>esc fechar</span>
            </div>
            {isLoading && (
              <Search className="text-muted-foreground size-4 animate-pulse" />
            )}
          </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  )
}
```

Component is ~150 lines with sub-components extracted.

- [ ] **Step 2: Verify typecheck**

```bash
cd /home/artur/projects && pnpm typecheck --filter web
```

If the base-ui `CommandItem` `onSelect` prop has a different API, adjust to use the correct callback prop name. Check `AutocompleteItem` props — it may use `onClick` instead. If so, replace `onSelect` with the correct prop.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/shared/command-palette.tsx
git commit -m "feat(web): add CommandPalette component with quick actions and search results"
```

---

## Task 5: Layout integration — Mount CommandPalette

**Context:** Mount `<CommandPalette />` inside `AppShell` (the authenticated layout shell) so it is available on all dashboard pages. It renders a dialog portal, so placement in the tree does not affect visual position.

**Files:**

- Modify: `apps/web/src/components/layout/app-shell.tsx`

- [ ] **Step 1: Import and mount CommandPalette**

In `apps/web/src/components/layout/app-shell.tsx`, add the import at the top:

```typescript
import { CommandPalette } from '@/components/shared/command-palette'
```

Inside the `AppShell` return, add `<CommandPalette />` as the last child inside the root `<div>`:

```tsx
return (
  <div className="flex h-screen overflow-hidden">
    {/* ...existing sidebar and content... */}
    <CommandPalette />
  </div>
)
```

- [ ] **Step 2: Verify typecheck and build**

```bash
cd /home/artur/projects && pnpm typecheck --filter web && pnpm build --filter web
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/app-shell.tsx
git commit -m "feat(web): mount CommandPalette in authenticated layout"
```

---

## Task 6: Testing and QA

**Context:** Verify the full flow works: backend returns correct shape, frontend displays results, keyboard shortcuts function, tenant isolation holds.

- [ ] **Step 1: Manual backend test**

Start the server and test the endpoint directly:

```bash
cd /home/artur/projects && pnpm dev --filter server
```

In another terminal, use the app's authenticated session or test via curl with a valid session cookie:

```bash
curl -s 'http://localhost:3001/api/v1/search?q=test&limit=10' \
  -H 'Cookie: <session-cookie>' | jq .
```

Verify response shape: `{ success: true, data: { clients, proposals, policies, claims }, meta: { query, totalResults } }`

- [ ] **Step 2: Run full typecheck and lint**

```bash
cd /home/artur/projects && pnpm typecheck && pnpm lint
```

Fix any errors.

- [ ] **Step 3: QA via Playwright MCP**

Open the app in browser. Test:

1. Press `Cmd+K` (or `Ctrl+K`) — palette opens
2. Quick actions visible (Novo Cliente, Nova Proposta, Dashboard, Configuracoes)
3. Type a client name (>= 2 chars) — results appear grouped by entity
4. Type a CPF like `123.456` — client results appear
5. Arrow keys navigate items, Enter selects and navigates to detail page
6. Escape closes the palette
7. Loading indicator shows during fetch
8. "Nenhum resultado encontrado" shows for no-match queries

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test: verify global search Cmd+K palette end-to-end"
```

---

## Acceptance Criteria Checklist

| #   | Criteria                               | Verified in                                   |
| --- | -------------------------------------- | --------------------------------------------- |
| 1   | Cmd+K opens palette                    | Task 6 Step 3                                 |
| 2   | Quick actions visible when input empty | Task 6 Step 3                                 |
| 3   | Search triggers after 2 chars          | Task 3 (MIN_QUERY_LENGTH)                     |
| 4   | Debounce 300ms                         | Task 3 (useDebounce)                          |
| 5   | Results grouped by entity              | Task 4 (SearchResultsGroups)                  |
| 6   | CPF/CNPJ search works                  | Task 1 (stripNonDigits + documentPattern)     |
| 7   | Navigation works on select             | Task 4 (handleSelect + router.push)           |
| 8   | Keyboard navigation                    | Task 6 Step 3                                 |
| 9   | Tenant isolation                       | Task 1 (all queries scoped by organizationId) |
| 10  | Response format                        | Task 1 (success/data/meta)                    |
| 11  | Soft-deleted excluded                  | Task 1 (deletedAt: null in all queries)       |
| 12  | Loading state                          | Task 4 (isLoading indicator)                  |
| 13  | Empty state                            | Task 4 (CommandEmpty)                         |
| 14  | No cmdk dependency                     | Task 4 (uses @/components/ui/command)         |
| 15  | Component under 200 lines              | Task 4 (~150 lines)                           |
