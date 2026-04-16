# Currency & Percentage Input Mask

**Jira:** SCRUM-53 | **Status:** Design approved | **Date:** 2026-04-16

## Problem

All monetary input fields require users to type raw cents (e.g., `150000` for R$ 1.500,00) and percentage fields require basis points (e.g., `1500` for 15%). This is error-prone, confusing, and does not match how Brazilian insurance professionals work.

## Solution

Two reusable UI components — `CurrencyInput` and `PercentageInput` — that accept user-friendly formatted values and convert bidirectionally to the integer format the backend expects.

**Approach:** Free-format input (Option B from prototype). User types the decimal value naturally (`2719,48`), component auto-formats with thousand separators (`2.719,48`) and converts to/from integer cents/basis points internally.

**No backend changes required.** The backend already stores money as `Int` (cents) and percentages as `Int` (basis points). Only the frontend input layer changes.

## Components

### `CurrencyInput`

**Location:** `apps/web/src/components/ui/currency-input.tsx`

**Behavior:**

- Visual prefix `R$` (non-editable, decorative)
- User types in reais with comma as decimal separator: `2719,48`
- Auto-formats with dot thousand separators on input: `2.719,48`
- On blur, normalizes to exactly 2 decimal places
- Accepts pasting formatted values: `R$ 2.719,48`, `1500,00`, `3.450,99`
- `inputmode="decimal"` for mobile numeric keyboard with comma
- Max 2 decimal places enforced

**Interface:**

```tsx
interface CurrencyInputProps {
  value: number // cents (Int) — from form state
  onChange: (cents: number) => void // cents (Int) — to form state
  placeholder?: string // default "0,00"
  disabled?: boolean
  id?: string
  name?: string
}
```

**Conversion logic:**

- Display → Value: strip `R$`, spaces, dots; replace comma with dot; `Math.round(parseFloat(cleaned) * 100)`
- Value → Display: `(cents / 100).toFixed(2)` → replace dot with comma → add thousand separators with dots

### `PercentageInput`

**Location:** `apps/web/src/components/ui/percentage-input.tsx`

**Behavior:**

- Visual suffix `%` (non-editable, decorative)
- User types percentage value: `15,50` for 15.50%
- Max value clamped to `100,00` (maps to 10000 basis points)
- On blur, normalizes to exactly 2 decimal places
- `inputmode="decimal"` for mobile

**Interface:**

```tsx
interface PercentageInputProps {
  value: number // basis points (Int) — from form state
  onChange: (basis: number) => void // basis points (Int) — to form state
  max?: number // max basis points, default 10000 (100%)
  placeholder?: string // default "0,00"
  disabled?: boolean
  id?: string
  name?: string
}
```

**Conversion logic:**

- Display → Value: replace comma with dot; `Math.min(Math.round(parseFloat(cleaned) * 100), max)`
- Value → Display: `(basis / 100).toFixed(2)` → replace dot with comma

### react-hook-form Integration

Both components use `Controller` (not `register`) because they manage display state independently from form value:

```tsx
<Controller
  name="premiumValueInCents"
  control={form.control}
  render={({ field }) => (
    <CurrencyInput value={field.value} onChange={field.onChange} />
  )}
/>
```

### No External Dependencies

Implemented with vanilla logic (as validated in the prototype). The formatting/parsing is ~30 lines per component — no justification for adding `react-number-format` or similar library.

## Fields to Update

| File                                                                           | Field                   | Current                                      | New Component                        |
| ------------------------------------------------------------------------------ | ----------------------- | -------------------------------------------- | ------------------------------------ |
| `apps/web/src/features/proposals/components/branch-fields.tsx`                 | `premiumValueInCents`   | `<Input type="number">` with `valueAsNumber` | `<CurrencyInput>` via `Controller`   |
| `apps/web/src/features/proposals/components/branch-fields.tsx`                 | `commissionBasisPoints` | `<Input type="number">` with `valueAsNumber` | `<PercentageInput>` via `Controller` |
| `apps/web/src/features/proposals/components/branch-field-sets/life-fields.tsx` | `monthlyIncomeCents`    | `<Input type="number">` with `valueAsNumber` | `<CurrencyInput>` via `Controller`   |

### Label/Hint Changes

| Field                   | Current Label             | New Label                     | Current Hint                             | New Hint    |
| ----------------------- | ------------------------- | ----------------------------- | ---------------------------------------- | ----------- |
| `premiumValueInCents`   | "Valor do Prêmio"         | "Valor do Prêmio" (unchanged) | "Em centavos (ex: 150000 = R$ 1.500,00)" | _(removed)_ |
| `commissionBasisPoints` | "Comissão (%)"            | "Comissão"                    | "Em pontos base (ex: 1500 = 15%)"        | _(removed)_ |
| `monthlyIncomeCents`    | "Renda Mensal (centavos)" | "Renda Mensal"                | "Ex: 500000 = R$ 5.000"                  | _(removed)_ |

Hints are no longer needed because the input format is self-explanatory (R$ prefix, % suffix, formatted display).

## Edge Cases

| Scenario                                             | Behavior                                                                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Empty field                                          | Returns `0` to form, displays empty/placeholder                                                                                   |
| Paste `R$ 2.719,48`                                  | Strips prefix and dots, parses `2719,48` → `271948` cents                                                                         |
| Paste `150000` (ambiguous — could be cents or reais) | Treats as `150000` reais → `15000000` cents. This matches free-format expectation. If user meant cents, they correct in the field |
| Multiple commas `1,500,00`                           | Takes first comma as decimal separator, strips rest                                                                               |
| Letters or invalid chars                             | Stripped on input, only digits and comma allowed                                                                                  |
| Negative values                                      | Not allowed, stripped                                                                                                             |
| Commission > 100%                                    | Clamped to `100,00` (10000 basis points)                                                                                          |
| Very large values (> R$ 999.999.999,99)              | Allowed, formats with dots                                                                                                        |
| Zero value `0,00`                                    | Valid, stores as `0`                                                                                                              |

## Validation

Zod schemas remain unchanged. Backend already validates:

- `premiumValueInCents`: `z.number().int().min(0)`
- `commissionBasisPoints`: `z.number().int().min(0).max(10000)`

Frontend form-level validation continues to work through Orval-generated Zod schemas. The `Controller` `onChange` emits the integer value directly.

## Testing

- Unit tests for conversion functions: `reaisToCents()`, `centsToReais()`, `percentToBasis()`, `basisToPercent()`
- Unit tests for formatting: thousand separators, decimal normalization, paste cleaning
- Manual QA via Playwright: type values, paste values, verify display and stored value match
