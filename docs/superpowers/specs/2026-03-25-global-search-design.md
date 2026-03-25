# Global Search (Command Palette) — Design Spec

## Goal

Provide a unified search experience across the Bens Seguros ERP. Users press `Cmd+K` / `Ctrl+K` to open a command palette that searches clients, proposals, policies, and claims in a single query. The palette also offers quick navigation shortcuts for frequent actions.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  CommandPalette (mounted in root layout)                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ CommandInput  [Cmd+K / Ctrl+K to open]                 │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ Quick Actions (when input is empty)                    │  │
│  │   Novo Cliente, Nova Proposta, Dashboard, Configurações│  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ Search Results (grouped by entity)                     │  │
│  │   Clientes ▸ item, item                                │  │
│  │   Propostas ▸ item, item                               │  │
│  │   Apólices  ▸ item, item                               │  │
│  │   Sinistros ▸ item, item                               │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
         │                                    ▲
         ▼                                    │
   useGlobalSearch hook              GET /api/v1/search?q=...
   (debounce 300ms, min 2 chars)     (aggregated multi-entity)
```

---

## Backend — Search Endpoint

### Route

```
GET /api/v1/search?q={query}&limit={number}
```

### Middleware Chain

`authMiddleware -> requireAuth -> tenantMiddleware -> requireAbility('read', 'all')`

### Query Parameters (Zod schema)

```typescript
const searchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(10),
})
```

### Search Logic

One use case class: `GlobalSearchUseCase` with single `execute()` method.

Run 4 queries in parallel (`Promise.all`), each scoped by `organizationId`:

| Entity   | Table      | Fields searched                                           | Returned fields                               |
| -------- | ---------- | --------------------------------------------------------- | --------------------------------------------- |
| Client   | `Client`   | `name`, `email`, `document` (CPF/CNPJ)                    | `id`, `name`, `document`, `type` (PF/PJ)      |
| Proposal | `Proposal` | `proposalNumber`, `clientName` (join)                     | `id`, `proposalNumber`, `stage`, `clientName` |
| Policy   | `Policy`   | `policyNumber`, `clientName` (join)                       | `id`, `policyNumber`, `branch`, `clientName`  |
| Claim    | `Claim`    | `claimNumber`, `policyNumber` (join), `clientName` (join) | `id`, `claimNumber`, `status`, `clientName`   |

- Use `ILIKE` with `%query%` for text fields.
- For `document` field: strip non-digits from query before matching (supports raw CPF/CNPJ input like `123.456.789-00`).
- Each sub-query limited to `Math.ceil(limit / 4)` to keep total results near `limit`.
- Exclude soft-deleted records (`deletedAt IS NULL`).

### Response Shape

```json
{
  "success": true,
  "data": {
    "clients": [
      { "id": "...", "name": "...", "document": "...", "type": "PF" }
    ],
    "proposals": [
      {
        "id": "...",
        "proposalNumber": "...",
        "stage": "QUOTE",
        "clientName": "..."
      }
    ],
    "policies": [
      {
        "id": "...",
        "policyNumber": "...",
        "branch": "AUTO",
        "clientName": "..."
      }
    ],
    "claims": [
      {
        "id": "...",
        "claimNumber": "...",
        "status": "OPEN",
        "clientName": "..."
      }
    ]
  },
  "meta": {
    "query": "joao",
    "totalResults": 7
  }
}
```

### File Structure

```
apps/api/src/modules/search/
  search-routes.ts          # route schema + handler + registration
  global-search-use-case.ts # @injectable(), single execute()
  search-types.ts           # Zod schemas + result types
```

---

## Frontend — Command Palette

### Components

All built on the existing `@/components/ui/command` components (based on `@base-ui/react`, NOT cmdk).

#### `CommandPalette` (~180 lines max)

**File:** `apps/web/src/components/shared/command-palette.tsx`

- Uses `CommandDialog` + `CommandDialogPopup` for the modal overlay.
- Manages open/close state via `CommandCreateHandle`.
- Registers global `Cmd+K` / `Ctrl+K` keydown listener (in a `useEffect`).
- Two modes:
  1. **Empty input** — shows quick actions group.
  2. **Has query** — shows search results grouped by entity.

```tsx
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandDialogPopup>
    <Command>
      <CommandInput placeholder="Buscar clientes, propostas, apólices..." />
      <CommandPanel>
        <CommandList>
          {!query && <QuickActionsGroup />}
          {query && <SearchResultsGroups results={results} />}
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        </CommandList>
      </CommandPanel>
      <CommandFooter>
        <span>↑↓ navegar</span>
        <span>↵ abrir</span>
        <span>esc fechar</span>
      </CommandFooter>
    </Command>
  </CommandDialogPopup>
</CommandDialog>
```

#### `QuickActionsGroup` (extract as sub-component)

Static list of navigation shortcuts, rendered when input is empty:

| Label         | Icon              | Route            | Shortcut hint |
| ------------- | ----------------- | ---------------- | ------------- |
| Novo Cliente  | `UserPlus`        | `/clients/new`   | —             |
| Nova Proposta | `FilePlus`        | `/proposals/new` | —             |
| Dashboard     | `LayoutDashboard` | `/`              | —             |
| Configurações | `Settings`        | `/settings`      | —             |

#### `SearchResultsGroups` (extract as sub-component)

Renders one `CommandGroup` per entity type that has results. Each `CommandItem` navigates via `router.push()` on selection.

### `useGlobalSearch` Hook

**File:** `apps/web/src/hooks/use-global-search.ts`

```typescript
interface UseGlobalSearchOptions {
  readonly debounceMs?: number // default 300
  readonly limit?: number // default 10
}

function useGlobalSearch(
  query: string,
  options?: UseGlobalSearchOptions
): {
  readonly results: GlobalSearchResults | undefined
  readonly isLoading: boolean
  readonly totalResults: number
}
```

Implementation:

- Uses existing `useDebounce` hook (300ms).
- Skips fetch when `debouncedQuery.length < 2`.
- React Query config: `staleTime: 30_000`, `gcTime: 60_000`.
- Query key: `['global-search', debouncedQuery]`.

### Mount Point

Add `<CommandPalette />` in `apps/web/src/app/(authenticated)/layout.tsx` (the authenticated layout), so it is available on all authenticated pages.

---

## Search Result Types

**File:** `apps/web/src/components/shared/command-palette.types.ts`

```typescript
interface GlobalSearchResults {
  readonly clients: readonly ClientSearchResult[]
  readonly proposals: readonly ProposalSearchResult[]
  readonly policies: readonly PolicySearchResult[]
  readonly claims: readonly ClaimSearchResult[]
}

interface ClientSearchResult {
  readonly id: string
  readonly name: string
  readonly document: string
  readonly type: 'PF' | 'PJ'
}

interface ProposalSearchResult {
  readonly id: string
  readonly proposalNumber: string
  readonly stage: string
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
  readonly claimNumber: string
  readonly status: string
  readonly clientName: string
}
```

Each result type maps to a route:

- Client -> `/clients/{id}`
- Proposal -> `/proposals/{id}`
- Policy -> `/policies/{id}`
- Claim -> `/claims/{id}`

---

## Keyboard Shortcuts

| Shortcut         | Context          | Action                    |
| ---------------- | ---------------- | ------------------------- |
| `Cmd+K`/`Ctrl+K` | Global           | Open command palette      |
| `Escape`         | Palette open     | Close palette             |
| `ArrowUp/Down`   | Palette open     | Navigate results          |
| `Enter`          | Item highlighted | Navigate to selected item |

Conflict check: `Cmd+B` is already used for sidebar toggle — no conflict with `Cmd+K`.

---

## Acceptance Criteria

1. **Cmd+K opens palette** — pressing `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) on any authenticated page opens the command palette dialog.
2. **Quick actions visible** — when input is empty, quick actions (Novo Cliente, Nova Proposta, Dashboard, Configuracoes) are displayed and navigable.
3. **Search triggers after 2 chars** — typing fewer than 2 characters shows no results and makes no API call.
4. **Debounce 300ms** — rapid typing does not flood the API; only the final value after 300ms pause triggers a request.
5. **Results grouped by entity** — search results appear in labeled groups: Clientes, Propostas, Apolices, Sinistros.
6. **CPF/CNPJ search works** — searching `123.456` or `12345678900` matches clients by document field.
7. **Navigation works** — selecting a result navigates to the correct detail page and closes the palette.
8. **Keyboard navigation** — ArrowUp/Down highlights items, Enter selects, Escape closes.
9. **Tenant isolation** — all queries scoped by `organizationId`; no cross-tenant data leakage.
10. **Response format** — API returns `{ success: true, data: { clients, proposals, policies, claims }, meta }`.
11. **Soft-deleted excluded** — records with `deletedAt` set are never returned.
12. **Loading state** — a loading indicator appears while the search request is in flight.
13. **Empty state** — "Nenhum resultado encontrado." shown when query returns zero results.
14. **No cmdk dependency** — built entirely on existing `@/components/ui/command` (base-ui).
15. **Component under 200 lines** — main `CommandPalette` component stays under 200 lines by extracting sub-components.
