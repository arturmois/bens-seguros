# Currency & Percentage Input Mask — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw integer inputs (cents/basis points) with formatted currency and percentage inputs across all monetary fields.

**Architecture:** Two reusable components (`CurrencyInput`, `PercentageInput`) with pure conversion functions. Components accept/emit integers (cents/basis points) but display formatted values. No backend changes.

**Tech Stack:** React 19, react-hook-form Controller, vanilla formatting logic (no external lib).

**Spec:** `docs/superpowers/specs/2026-04-16-currency-input-mask-design.md`

---

## File Map

| Action | File                                                                           | Purpose                                                               |
| ------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Create | `apps/web/src/lib/currency.ts`                                                 | Pure conversion/formatting functions for BRL currency and percentages |
| Create | `apps/web/src/components/ui/currency-input.tsx`                                | CurrencyInput component (R$ prefix, free-format, emits cents)         |
| Create | `apps/web/src/components/ui/percentage-input.tsx`                              | PercentageInput component (% suffix, emits basis points)              |
| Modify | `apps/web/src/features/proposals/components/branch-fields.tsx`                 | Replace premium + commission inputs                                   |
| Modify | `apps/web/src/features/proposals/components/branch-field-sets/life-fields.tsx` | Replace monthlyIncomeCents input                                      |

---

### Task 1: Create pure conversion/formatting functions

**Files:**

- Create: `apps/web/src/lib/currency.ts`

These are pure functions with no React dependency — easy to test independently.

- [ ] **Step 1: Create `apps/web/src/lib/currency.ts`**

```ts
/**
 * Converts a BRL-formatted string (e.g. "2.719,48") to integer cents.
 * Strips R$, spaces, dots (thousand sep). Treats comma as decimal separator.
 * Returns 0 for empty/invalid input.
 */
export function parseBRLToCents(display: string): number {
  if (!display) return 0
  const cleaned = display
    .replace(/R\$\s*/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const num = parseFloat(cleaned)
  if (isNaN(num) || num < 0) return 0
  return Math.round(num * 100)
}

/**
 * Converts integer cents to a BRL-formatted display string (e.g. "2.719,48").
 * Returns empty string for 0/falsy (so placeholder shows).
 */
export function centsToDisplay(cents: number): string {
  if (!cents) return ''
  const reais = (cents / 100).toFixed(2)
  const [intPart, decPart] = reais.split('.')
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots},${decPart}`
}

/**
 * Formats a raw user-typed string into BRL display format.
 * Strips non-digit/comma chars, enforces max 2 decimal places,
 * adds thousand separators. Used on every keystroke.
 */
export function formatBRLInput(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, '')
  if (!cleaned) return ''

  const parts = cleaned.split(',')
  let intPart = parts[0] ?? ''
  const decPart = parts.length > 1 ? parts[1] : null

  intPart = intPart.replace(/^0+(?=\d)/, '')
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  if (decPart !== null) {
    return `${intPart},${decPart.slice(0, 2)}`
  }
  return intPart
}

/**
 * Cleans a pasted value for BRL currency input.
 * Handles: "R$ 2.719,48", "1500,00", "3.450,99".
 */
export function cleanPastedBRL(pasted: string): string {
  return pasted.replace(/R\$\s*/g, '').trim()
}

/**
 * Converts a percentage display string (e.g. "15,50") to basis points.
 * Clamps to max (default 10000 = 100%).
 */
export function parsePercentToBasis(display: string, max = 10000): number {
  if (!display) return 0
  const cleaned = display.replace(/[^\d,]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  if (isNaN(num) || num < 0) return 0
  return Math.min(Math.round(num * 100), max)
}

/**
 * Converts basis points to percentage display string (e.g. "15,50").
 * Returns empty string for 0/falsy.
 */
export function basisToDisplay(basis: number): string {
  if (!basis) return ''
  return (basis / 100).toFixed(2).replace('.', ',')
}

/**
 * Formats a raw user-typed string for percentage input.
 * Strips non-digit/comma, enforces max 2 decimal places.
 * Clamps integer part to max percentage (default 100).
 */
export function formatPercentInput(raw: string, maxPercent = 100): string {
  const cleaned = raw.replace(/[^\d,]/g, '')
  if (!cleaned) return ''

  const parts = cleaned.split(',')
  let intPart = parts[0] ?? ''
  const decPart = parts.length > 1 ? parts[1] : null

  intPart = intPart.replace(/^0+(?=\d)/, '')

  if (parseInt(intPart || '0', 10) > maxPercent) {
    intPart = String(maxPercent)
    if (decPart !== null) {
      return `${intPart},00`
    }
    return intPart
  }

  if (decPart !== null) {
    return `${intPart},${decPart.slice(0, 2)}`
  }
  return intPart
}
```

- [ ] **Step 2: Verify the file has no syntax errors**

Run: `cd apps/web && npx tsc --noEmit src/lib/currency.ts --skipLibCheck 2>&1 | head -20`

Expected: no errors (pure TS, no imports).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/currency.ts
git commit -m "feat(web): add BRL currency and percentage conversion functions

Pure formatting/parsing utilities for CurrencyInput and PercentageInput.
SCRUM-53"
```

---

### Task 2: Create `CurrencyInput` component

**Files:**

- Create: `apps/web/src/components/ui/currency-input.tsx`
- Read (reference): `apps/web/src/components/ui/input.tsx` — reuse the `Input` component and its styling

- [ ] **Step 1: Create `apps/web/src/components/ui/currency-input.tsx`**

```tsx
'use client'

import { useCallback, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  centsToDisplay,
  cleanPastedBRL,
  formatBRLInput,
  parseBRLToCents,
} from '@/lib/currency'

interface CurrencyInputProps {
  readonly value: number
  readonly onChange: (cents: number) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly id?: string
  readonly name?: string
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00',
  disabled,
  id,
  name,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(() => centsToDisplay(value))
  const lastExternalValue = useRef(value)

  // Sync display when external value changes (e.g. form reset)
  if (value !== lastExternalValue.current) {
    lastExternalValue.current = value
    setDisplay(centsToDisplay(value))
  }

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const formatted = formatBRLInput(raw)
      setDisplay(formatted)

      const cents = parseBRLToCents(formatted)
      lastExternalValue.current = cents
      onChange(cents)
    },
    [onChange]
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text')
      const cleaned = cleanPastedBRL(pasted)
      const formatted = formatBRLInput(cleaned)
      setDisplay(formatted)

      const cents = parseBRLToCents(formatted)
      lastExternalValue.current = cents
      onChange(cents)
    },
    [onChange]
  )

  const handleBlur = useCallback(() => {
    if (!display) return
    const cents = parseBRLToCents(display)
    if (cents === 0) {
      setDisplay('')
      return
    }
    setDisplay(centsToDisplay(cents))
  }, [display])

  return (
    <div className="relative">
      <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 select-none text-sm">
        R$
      </span>
      <Input
        type="text"
        inputMode="decimal"
        id={id}
        name={name}
        value={display}
        onChange={handleInput}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-10"
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck 2>&1 | tail -5`

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/currency-input.tsx
git commit -m "feat(web): add CurrencyInput component with R$ prefix and auto-formatting

Free-format BRL input: user types reais (2719,48), displays formatted
(2.719,48), emits integer cents (271948). Supports paste.
SCRUM-53"
```

---

### Task 3: Create `PercentageInput` component

**Files:**

- Create: `apps/web/src/components/ui/percentage-input.tsx`

- [ ] **Step 1: Create `apps/web/src/components/ui/percentage-input.tsx`**

```tsx
'use client'

import { useCallback, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  basisToDisplay,
  formatPercentInput,
  parsePercentToBasis,
} from '@/lib/currency'

interface PercentageInputProps {
  readonly value: number
  readonly onChange: (basis: number) => void
  readonly max?: number
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly id?: string
  readonly name?: string
}

export function PercentageInput({
  value,
  onChange,
  max = 10000,
  placeholder = '0,00',
  disabled,
  id,
  name,
}: PercentageInputProps) {
  const maxPercent = max / 100
  const [display, setDisplay] = useState(() => basisToDisplay(value))
  const lastExternalValue = useRef(value)

  // Sync display when external value changes (e.g. form reset)
  if (value !== lastExternalValue.current) {
    lastExternalValue.current = value
    setDisplay(basisToDisplay(value))
  }

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const formatted = formatPercentInput(raw, maxPercent)
      setDisplay(formatted)

      const basis = parsePercentToBasis(formatted, max)
      lastExternalValue.current = basis
      onChange(basis)
    },
    [onChange, max, maxPercent]
  )

  const handleBlur = useCallback(() => {
    if (!display) return
    const basis = parsePercentToBasis(display, max)
    if (basis === 0) {
      setDisplay('')
      return
    }
    setDisplay(basisToDisplay(basis))
  }, [display, max])

  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        id={id}
        name={name}
        value={display}
        onChange={handleInput}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-8"
      />
      <span className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 select-none text-sm">
        %
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck 2>&1 | tail -5`

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/percentage-input.tsx
git commit -m "feat(web): add PercentageInput component with % suffix and clamping

Free-format percentage input: user types 15,50, emits 1550 basis points.
Clamped to 100%. SCRUM-53"
```

---

### Task 4: Replace inputs in `branch-fields.tsx`

**Files:**

- Modify: `apps/web/src/features/proposals/components/branch-fields.tsx`

This file contains both the premium and commission fields. Replace `<Input type="number">` with `Controller` + new components.

- [ ] **Step 1: Update imports**

In `apps/web/src/features/proposals/components/branch-fields.tsx`, replace:

```tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
```

with:

```tsx
import { Controller } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { PercentageInput } from '@/components/ui/percentage-input'
```

Note: `Input` is no longer used directly in this file. `useForm` and `FieldValues` are already imported from `react-hook-form`. `Controller` needs to be added to the existing import.

Actually, the file already imports `{ useForm }` from `react-hook-form` and `type { FieldValues }`. Update the import to:

```tsx
import type { FieldValues } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
```

And remove the `Input` import since it's no longer used in this file.

- [ ] **Step 2: Replace the premium field**

Replace:

```tsx
<FieldWrapper
  label="Valor do Prêmio"
  required
  hint="Em centavos (ex: 150000 = R$ 1.500,00)"
>
  <Input
    type="number"
    placeholder="150000"
    {...form.register('premiumValueInCents', { valueAsNumber: true })}
  />
</FieldWrapper>
```

with:

```tsx
<FieldWrapper label="Valor do Prêmio" required>
  <Controller
    name="premiumValueInCents"
    control={form.control}
    render={({ field }) => (
      <CurrencyInput value={field.value ?? 0} onChange={field.onChange} />
    )}
  />
</FieldWrapper>
```

- [ ] **Step 3: Replace the commission field**

Replace:

```tsx
<FieldWrapper
  label="Comissão (%)"
  required
  hint="Em pontos base (ex: 1500 = 15%)"
>
  <Input
    type="number"
    placeholder="1500"
    {...form.register('commissionBasisPoints', {
      valueAsNumber: true,
    })}
  />
</FieldWrapper>
```

with:

```tsx
<FieldWrapper label="Comissão" required>
  <Controller
    name="commissionBasisPoints"
    control={form.control}
    render={({ field }) => (
      <PercentageInput value={field.value ?? 0} onChange={field.onChange} />
    )}
  />
</FieldWrapper>
```

- [ ] **Step 4: Simplify `handleFormSubmit`**

The `Number() || 0` coercion is no longer needed because `CurrencyInput` and `PercentageInput` already emit integers. Replace:

```tsx
function handleFormSubmit(values: FieldValues) {
  const { premiumValueInCents, commissionBasisPoints, ...rest } = values
  const details: InsuredObjectDetails = buildDetails(branch, rest)
  onSubmit({
    details,
    premiumValueInCents: Number(premiumValueInCents) || 0,
    commissionBasisPoints: Number(commissionBasisPoints) || 0,
  })
}
```

with:

```tsx
function handleFormSubmit(values: FieldValues) {
  const { premiumValueInCents, commissionBasisPoints, ...rest } = values
  const details: InsuredObjectDetails = buildDetails(branch, rest)
  onSubmit({
    details,
    premiumValueInCents: premiumValueInCents ?? 0,
    commissionBasisPoints: commissionBasisPoints ?? 0,
  })
}
```

- [ ] **Step 5: Verify typecheck passes**

Run: `pnpm typecheck 2>&1 | tail -5`

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/proposals/components/branch-fields.tsx
git commit -m "feat(web): replace raw premium/commission inputs with CurrencyInput/PercentageInput

Users now type R$ values and percentages directly instead of raw cents/basis points.
SCRUM-53"
```

---

### Task 5: Replace input in `life-fields.tsx`

**Files:**

- Modify: `apps/web/src/features/proposals/components/branch-field-sets/life-fields.tsx`

- [ ] **Step 1: Update imports**

In `apps/web/src/features/proposals/components/branch-field-sets/life-fields.tsx`, add the `CurrencyInput` import. The file already imports `Controller` from `react-hook-form`. Replace:

```tsx
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
```

with:

```tsx
import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
```

`Input` is still used for height and weight fields, so keep it.

- [ ] **Step 2: Replace the monthly income field**

Replace:

```tsx
<FieldWrapper label="Renda Mensal (centavos)">
  <Input
    type="number"
    placeholder="Ex: 500000 = R$ 5.000"
    {...register('monthlyIncomeCents', { valueAsNumber: true })}
  />
</FieldWrapper>
```

with:

```tsx
<FieldWrapper label="Renda Mensal">
  <Controller
    name="monthlyIncomeCents"
    control={control}
    render={({ field }) => (
      <CurrencyInput value={field.value ?? 0} onChange={field.onChange} />
    )}
  />
</FieldWrapper>
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm typecheck 2>&1 | tail -5`

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/proposals/components/branch-field-sets/life-fields.tsx
git commit -m "feat(web): replace raw monthly income input with CurrencyInput in life fields

SCRUM-53"
```

---

### Task 6: Full quality gates + manual QA

- [ ] **Step 1: Run lint**

Run: `pnpm lint 2>&1 | tail -10`

Expected: no new errors. If there are lint issues (e.g. unused imports from removing `Input` in `branch-fields.tsx`), fix them.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck 2>&1 | tail -10`

Expected: zero errors.

- [ ] **Step 3: Run build**

Run: `pnpm build 2>&1 | tail -10`

Expected: successful build.

- [ ] **Step 4: Run tests**

Run: `pnpm test 2>&1 | tail -10`

Expected: all tests pass (no existing tests should break — changes are frontend-only).

- [ ] **Step 5: Start dev server and test manually**

Run: `pnpm dev` (server on :3001, web on :3000)

Navigate to a proposal in QUOTE stage or later. Open the "Objeto Segurado" section. Verify:

1. **Premium field** — shows `R$` prefix, type `2719,48` → displays `2.719,48` → saves as `271948` cents
2. **Commission field** — shows `%` suffix, type `15,50` → displays `15,50` → saves as `1550` basis points
3. **Editing existing values** — premium `271948` cents loads as `2.719,48`, commission `1550` loads as `15,50`
4. **Life insurance** — switch branch to LIFE, verify "Renda Mensal" field has `R$` prefix and formats correctly
5. **Paste test** — copy `R$ 2.719,48` from somewhere, paste into premium field → parses correctly
6. **Blur normalization** — type `1500` → blur → becomes `1.500,00`
7. **Empty field** — clear the field → shows placeholder `0,00` → submits as `0`
8. **Save and reload** — save, refresh page, verify values persist correctly

- [ ] **Step 6: Fix any issues found during QA, commit fixes**

- [ ] **Step 7: Final commit if any QA fixes were made**

```bash
git add -u
git commit -m "fix(web): QA fixes for currency/percentage inputs

SCRUM-53"
```
