# SCRUM-54: Coluna "Segurado" na Tabela de Apolices

**Date:** 2026-04-16
**Status:** Approved
**Jira:** SCRUM-54

## Context

The policy listing table displays: Policy Number, Branch, Status, Premium Value, and Validity Period. Users cannot identify which client (segurado) each policy belongs to without opening the detail page. This slows down daily operations.

The backend already returns `clientName` in the list-policies API response (via JOIN with Client table). The field is simply not rendered in the frontend.

## Design

### Desktop Table

- Add a new column **"Segurado"** immediately after "Nº Apólice"
- Column is **always visible** (not hideable by the user)
- Displays the `clientName` field from the API response
- Fallback: `"—"` when `clientName` is undefined/null
- Long names: truncate with `max-w-[200px] truncate` and show full name via tooltip on hover

**Final column order:**
`Nº Apólice | Segurado | Ramo | Status | Valor | Vigência | Criado em | Ações`

### Mobile Card

- Add client name as a **subtitle** below the policy number, before the data grid
- Styled as `text-muted-foreground text-sm` to differentiate from the primary identifier
- Fallback: `"—"` when `clientName` is undefined/null

**Card layout:**

```
[Nº Apólice]              [Status Badge]
Nome do Segurado
┌────────────┬────────────┐
│ Ramo       │ Valor      │
│ Vigência   │ Criado em  │
└────────────┴────────────┘
```

### Backend

No changes required. The `clientName` field is already:

- Fetched via Prisma `include` in `prisma-policy-repository.ts`
- Mapped in `policy-mapper.ts` (line 61)
- Defined in the route response schema `_schemas.ts` (line 67)
- Available in the Orval-generated type `ListPolicies200DataItem`

### Out of Scope

- Server-side sorting by client name (separate task if needed)
- Filtering by client name (already possible via `clientId` filter)
- Column visibility toggle/personalization feature

## Files to Change

| File                                                             | Change                                              |
| ---------------------------------------------------------------- | --------------------------------------------------- |
| `apps/web/src/features/policies/components/policies-columns.tsx` | Add "Segurado" column definition after policyNumber |
| `apps/web/src/features/policies/components/policy-card.tsx`      | Add client name subtitle below policy number        |

## Acceptance Criteria

1. Desktop table shows "Segurado" column with client name after "Nº Apólice"
2. Column is always visible and cannot be hidden
3. Mobile card shows client name as subtitle below policy number
4. Missing client names display "—" fallback
5. Long names are truncated with tooltip on desktop
6. No regressions in existing table functionality (pagination, filters, sorting)
7. Typecheck and lint pass
