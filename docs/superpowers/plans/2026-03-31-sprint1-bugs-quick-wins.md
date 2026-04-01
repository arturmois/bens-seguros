# Sprint 1: Bugs + Quick Wins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 blocking bugs and deliver 2 quick-win features to unblock the daily workflow of insurance brokers.

**Architecture:** All changes follow the existing patterns — DDD domain logic in `packages/core`, Fastify routes in `apps/server`, React components in `apps/web`. Schema changes via Prisma, frontend types regenerated via Orval.

**Tech Stack:** TypeScript 5.9, Prisma 7, Fastify 5, Next.js 16, React 19, React Hook Form, Zod, Orval, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-31-backlog-sprint-plan-design.md`

---

### Task 1: SCRUM-21 — Fix checklist text in PROTOCOL stage

**Files:**

- Modify: `packages/core/src/modules/proposal/domain/checklist-config.ts:37`
- Test: `packages/core/src/modules/proposal/domain/checklist-config.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create file `packages/core/src/modules/proposal/domain/checklist-config.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { StaticChecklistConfig } from './checklist-config.js'

describe('StaticChecklistConfig', () => {
  const config = new StaticChecklistConfig()

  it('returns "Proposta protocolada no Broker/Qualex" for PROTOCOL stage', () => {
    const items = config.getItems('PROTOCOL', 'AUTO')
    const protocolItem = items.find((i) => i.itemKey === 'protocol_registered')

    expect(protocolItem).toBeDefined()
    expect(protocolItem!.label).toBe('Proposta protocolada no Broker/Qualex')
  })

  it('returns base items merged with branch extras for CAPTURE + AUTO', () => {
    const items = config.getItems('CAPTURE', 'AUTO')
    const keys = items.map((i) => i.itemKey)

    expect(keys).toContain('client_data')
    expect(keys).toContain('driver_license')
    expect(keys).toContain('vehicle_registration')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/core exec vitest run src/modules/proposal/domain/checklist-config.spec.ts`

Expected: FAIL — label is "Proposta protocolada na seguradora", not "Proposta protocolada no Broker/Qualex"

- [ ] **Step 3: Fix the label string**

In `packages/core/src/modules/proposal/domain/checklist-config.ts`, change line 37:

```typescript
// Before:
    label: 'Proposta protocolada na seguradora',
// After:
    label: 'Proposta protocolada no Broker/Qualex',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/core exec vitest run src/modules/proposal/domain/checklist-config.spec.ts`

Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/proposal/domain/checklist-config.ts packages/core/src/modules/proposal/domain/checklist-config.spec.ts
git commit -m "fix(core): update PROTOCOL checklist text to Broker/Qualex (SCRUM-21)"
```

---

### Task 2: SCRUM-45 — Fix date picker not persisting in issue-policy modal

**Files:**

- Modify: `apps/web/src/components/ui/date-picker.tsx:68-73`
- Test: Manual via Playwright MCP

**Root cause analysis:** The `DatePicker` component uses a custom popover with `mousedown` listener for outside clicks (lines 34-43). When user clicks a calendar day, the `onSelect` callback fires (line 68) which calls `onChange(date)` then `setOpen(false)`. However, the `handleClickOutside` (line 37) fires on `mousedown` which happens BEFORE the calendar's `onSelect` click handler. This closes the popover and unmounts the Calendar before the select event completes, so `onChange` is never called.

- [ ] **Step 1: Fix the event listener race condition**

In `apps/web/src/components/ui/date-picker.tsx`, change the event from `mousedown` to `pointerdown` with a microtask delay, or better: close the popover only from `onSelect`, not from outside click competing with calendar clicks.

Replace lines 34-43:

```typescript
React.useEffect(() => {
  if (!open) return
  function handleClickOutside(event: MouseEvent) {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      setOpen(false)
    }
  }
  document.addEventListener('pointerdown', handleClickOutside)
  return () => document.removeEventListener('pointerdown', handleClickOutside)
}, [open])
```

**Why this works:** `pointerdown` fires in the same timing as `mousedown`, but the key fix is ensuring the Calendar's click (which is a full click, not just mousedown) is not intercepted. If this still races, an alternative fix is to use `focusout` or wrap the close in `requestAnimationFrame`:

```typescript
React.useEffect(() => {
  if (!open) return
  function handleClickOutside(event: MouseEvent) {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      requestAnimationFrame(() => setOpen(false))
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [open])
```

Use the `requestAnimationFrame` approach — it defers the close by one frame, allowing the `onSelect` handler to fire first.

- [ ] **Step 2: Verify the fix via Playwright**

1. Navigate to `http://localhost:3000/proposals`
2. Open a proposal at POLICY_ISSUED stage
3. Click "Emitir Apólice"
4. Click "Início da Vigência" date picker
5. Select a date
6. Verify the button text changes from "Selecione a data de início" to the selected date (e.g., "31/03/2026")
7. Repeat for "Fim da Vigência"

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/date-picker.tsx
git commit -m "fix(web): resolve date picker race condition in policy issuance (SCRUM-45)"
```

---

### Task 3: SCRUM-40 — Investigate and fix Kanban drag advance error

**Files:**

- Modify: `apps/web/src/features/proposals/components/proposal-kanban.tsx:113-167`
- Test: Manual via Playwright MCP (Kanban drag)

**Root cause analysis:** The `handleDragEnd` function (line 113) already has `isNextStage` validation (line 143) that checks `toIndex === fromIndex + 1`. The `ADVANCE_TARGETS` set (line 30) excludes CAPTURE. The bug report says "não é possível avançar a partir do estágio" — this error comes from the backend `advanceStage` use case, not the frontend.

The likely issue: when a proposal is at POLICY_ISSUED (terminal stage, index 5), the Kanban might still render it in a droppable column. Dropping it anywhere triggers the advance API call. The backend rejects it because POLICY_ISSUED has no next stage.

Looking at the code: `ADVANCE_TARGETS` includes `POLICY_ISSUED` (line 35). This means if a user drags from PAYMENT to POLICY_ISSUED, the frontend allows it and calls advance. But if the proposal is ALREADY at POLICY_ISSUED and gets dragged somewhere, `isNextStage` would catch it... unless the cached stage is stale.

**Fix:** Remove `POLICY_ISSUED` from `ADVANCE_TARGETS` since advancing TO policy_issued should use the "Emitir Apólice" button, not drag. Also add a guard for proposals already at terminal stage.

- [ ] **Step 1: Fix ADVANCE_TARGETS and add terminal guard**

In `apps/web/src/features/proposals/components/proposal-kanban.tsx`, change lines 30-36:

```typescript
const ADVANCE_TARGETS = new Set<ProposalStage>([
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
])
```

And add a guard after line 133 (`if (!found || found.stage === targetStage) return`):

```typescript
if (!found || found.stage === targetStage) return

const { proposal, stage: sourceStage } = found

if (sourceStage === 'POLICY_ISSUED') return
```

- [ ] **Step 2: Verify the fix**

Test via Playwright:

1. Navigate to proposals Kanban view
2. Create a proposal and advance it to PAYMENT stage
3. Verify dragging to POLICY_ISSUED column does nothing (card snaps back)
4. Verify the "Avançar" button and "Emitir Apólice" flow still works
5. Verify dragging between adjacent stages (e.g., CAPTURE → QUOTE) still works

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/components/proposal-kanban.tsx
git commit -m "fix(web): prevent Kanban drag to POLICY_ISSUED stage (SCRUM-40)"
```

---

### Task 4: SCRUM-28 — Add social media field to client registration

**Files:**

- Modify: `packages/db/prisma/schema.prisma:267-298` (Client model)
- Modify: `apps/server/src/routes/v1/clients/_schemas.ts:19-31`
- Modify: `apps/web/src/features/clients/components/client-form.tsx`
- Test: `packages/core/src/modules/client/application/create-client.spec.ts` (if exists, add test)

- [ ] **Step 1: Add `socialMedia` field to Prisma schema**

In `packages/db/prisma/schema.prisma`, add after line 281 (`tags` field):

```prisma
  socialMedia   Json?
```

- [ ] **Step 2: Push schema to dev database**

Run:

```bash
export $(grep -v '^#' .env | grep -v '^$' | xargs)
pnpm --filter @repo/db exec prisma db push
```

Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 3: Regenerate Prisma client**

Run:

```bash
export $(grep -v '^#' .env | grep -v '^$' | xargs)
pnpm --filter @repo/db exec prisma generate
```

Expected: "Generated Prisma Client"

- [ ] **Step 4: Add `socialMedia` to backend create/update schemas**

In `apps/server/src/routes/v1/clients/_schemas.ts`, add the social media schema.

After line 15 (imports), add:

```typescript
const socialMediaSchema = z
  .object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    linkedin: z.string().optional(),
    tiktok: z.string().optional(),
  })
  .optional()
```

In `createClientBodySchema` (line 19), add after `consentLgpd`:

```typescript
  socialMedia: socialMediaSchema,
```

In `clientDetailSchema` (line 61), add:

```typescript
  socialMedia: socialMediaSchema.nullable(),
```

- [ ] **Step 5: Add `socialMedia` to the create client use case mapper**

Check `packages/core/src/modules/client/infrastructure/` for the Prisma mapper. Add `socialMedia` to both `toDomain` and `toPersistence` if it maps fields explicitly. If the mapper passes through all fields from the request, no change needed — Prisma will handle it.

Also check the route handler in `apps/server/src/routes/v1/clients/create-client.ts` — if it destructures specific fields from the body, add `socialMedia`.

- [ ] **Step 6: Regenerate Orval types**

Run (requires server running on :3001):

```bash
pnpm --filter @app/web generate:api
```

Expected: New types generated in `apps/web/src/api/`

- [ ] **Step 7: Add social media fields to client form**

In `apps/web/src/features/clients/components/client-form.tsx` (or `client-form-fields.tsx` if fields are separate), add a "Redes Sociais" section after the existing fields:

```tsx
<FormField label="Instagram">
  <Input
    placeholder="@perfil"
    {...form.register('socialMedia.instagram')}
  />
</FormField>

<FormField label="Facebook">
  <Input
    placeholder="URL ou nome do perfil"
    {...form.register('socialMedia.facebook')}
  />
</FormField>

<FormField label="LinkedIn">
  <Input
    placeholder="URL do perfil"
    {...form.register('socialMedia.linkedin')}
  />
</FormField>

<FormField label="TikTok">
  <Input
    placeholder="@perfil"
    {...form.register('socialMedia.tiktok')}
  />
</FormField>
```

- [ ] **Step 8: Run quality gates**

```bash
pnpm lint
pnpm typecheck
```

Expected: zero errors

- [ ] **Step 9: Test via Playwright**

1. Navigate to `/clients`
2. Click "Novo Cliente"
3. Verify social media fields appear in the form
4. Fill name, document, and social media fields
5. Submit and verify client is created
6. Open client detail and verify social media data is displayed

- [ ] **Step 10: Commit**

```bash
git add packages/db/prisma/schema.prisma apps/server/src/routes/v1/clients/_schemas.ts apps/web/src/features/clients/
git commit -m "feat(clients): add social media field to client registration (SCRUM-28)"
```

---

### Task 5: SCRUM-47 — Add insurer selection to policy issuance modal

**Files:**

- Modify: `apps/web/src/features/proposals/components/issue-policy-sheet.tsx:25-166`
- Modify: `apps/server/src/routes/v1/policies/_schemas.ts:16-27`
- Modify: `apps/server/src/routes/v1/policies/issue-policy.ts`
- Modify: `packages/core/src/modules/policy/application/issue-policy.ts`

**Context:** The `Proposal` model already has `insurerId` (line 312 in schema.prisma). The `Policy` model has `insurerId`. Currently, `issue-policy.ts` copies `insurerId` from the proposal (line 51). But the proposal's `insurerId` may be null, and there's no way to set it at issuance time. The fix: allow passing `insurerId` in the issue-policy request body, falling back to the proposal's `insurerId`.

- [ ] **Step 1: Add `insurerId` to backend policy issuance schema**

In `apps/server/src/routes/v1/policies/_schemas.ts`, add to `issuePolicyBody` (after `endDate`):

```typescript
  insurerId: z.string().min(1).optional(),
```

- [ ] **Step 2: Update the issue-policy route to pass `insurerId`**

In `apps/server/src/routes/v1/policies/issue-policy.ts`, check how body fields are passed to the use case. Add `insurerId` from the body, passing it through to the use case.

The use case (`packages/core/src/modules/policy/application/issue-policy.ts`) currently reads `insurerId` from the proposal. Modify the execute input to accept an optional `insurerId` override:

```typescript
// In the execute method input type, add:
insurerId?: string

// In the policy creation logic, use:
insurerId: input.insurerId ?? proposal.insurerId
```

- [ ] **Step 3: Regenerate Orval types**

```bash
pnpm --filter @app/web generate:api
```

- [ ] **Step 4: Add insurer combobox to the issue-policy sheet**

In `apps/web/src/features/proposals/components/issue-policy-sheet.tsx`:

First, update the form schema (line 25) to include `insurerId`:

```typescript
const issuePolicyFormSchema = IssuePolicyBody.omit({
  proposalId: true,
  coverageDetails: true,
})
```

This should now include `insurerId` from the regenerated schema.

Update `EMPTY_VALUES` (line 32):

```typescript
const EMPTY_VALUES: IssuePolicyFormValues = {
  policyNumber: '',
  startDate: '',
  endDate: '',
  insurerId: undefined,
}
```

Add the insurer combobox in the form, after the policy number field (after line 109). You'll need to fetch insurers:

```tsx
import { useListInsurers } from '@/api/endpoints/insurers/insurers'

// Inside the component, add:
const { data: insurersData } = useListInsurers({ active: true })
const insurers = insurersData?.data ?? []
```

Add the form field after the policy number `FormField`:

```tsx
<FormField
  label="Seguradora"
  error={form.formState.errors.insurerId?.message}
  required
>
  <Controller
    name="insurerId"
    control={form.control}
    render={({ field }) => (
      <Select value={field.value} onValueChange={field.onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a seguradora" />
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
</FormField>
```

Import `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` from `@/components/ui/select`.

- [ ] **Step 5: Run quality gates**

```bash
pnpm lint
pnpm typecheck
```

Expected: zero errors

- [ ] **Step 6: Test via Playwright**

1. First, create an insurer via API or Settings UI
2. Navigate to a proposal at POLICY_ISSUED stage
3. Click "Emitir Apólice"
4. Verify "Seguradora" combobox appears with the created insurer
5. Fill all fields and submit
6. Verify policy is created with the correct insurer

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/routes/v1/policies/ apps/web/src/features/proposals/components/issue-policy-sheet.tsx packages/core/src/modules/policy/
git commit -m "feat(policies): add insurer selection to policy issuance modal (SCRUM-47)"
```

---

## Final Validation

- [ ] **Run all quality gates**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

All must pass with zero errors.

- [ ] **Playwright smoke test — full proposal flow**

1. Create a client with social media data
2. Create a NEW_INSURANCE / AUTO proposal for that client
3. Advance through all stages (Capture → Quote → Protocol → Inspection → Payment → Policy Issued)
4. Verify PROTOCOL checklist says "Proposta protocolada no Broker/Qualex"
5. Click "Emitir Apólice"
6. Select insurer, fill dates (verify they persist), fill policy number
7. Submit and verify policy is created
8. Navigate to Kanban view and verify drag behavior (no drag to POLICY_ISSUED column)
