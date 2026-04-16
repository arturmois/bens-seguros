# Flexible Date Input — Implementation Plan (SCRUM-52)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever o `DatePicker` do `apps/web` para aceitar digitação manual e colagem (Ctrl+V) em formatos flexíveis (`DD/MM/AAAA`, `DD-MM-AAAA`, `DDMMAAAA`, `DDMMAA`), mantendo o seletor visual (Popover + Calendar) e preservando a API atual (`value?: Date`, `onChange: (Date | undefined) => void`) — consumers não mudam.

**Architecture:** Lógica de parsing e normalização vai para `@repo/shared/date-utils` (puro TS, sem `date-fns`, testado com vitest). O componente `apps/web/src/components/ui/date-picker.tsx` vira um input mascarado (`@react-input/mask`) com botão de calendário à direita; onPaste intercepta e normaliza antes de entregar à máscara; blur valida semanticamente e mostra erro local (não interfere no form state). QA Playwright valida integração em um form representativo.

**Tech Stack:** TypeScript 5.9 strict · `@repo/shared` (vitest 3) · `@react-input/mask` 2 · `react-day-picker` 9 · React 19 · Next.js 16

**Spec de referência:** `docs/superpowers/specs/2026-04-15-flexible-date-input-design.md`

**Decisões ajustadas durante o planejamento** (complemento à spec):

- API do componente mantém `value?: Date` / `onChange: (Date | undefined) => void` (estado real, não ISO string como a spec dizia erroneamente). Consumers continuam convertendo ISO↔Date no boundary.
- Tests em `@repo/shared/src/date-utils.spec.ts` (vitest já configurado). `apps/web` não recebe setup de vitest neste plano — componente é validado via QA Playwright.
- Sem dependência nova em `date-fns` no `@repo/shared`: validação de data real (incluindo bissexto) é feita manualmente em ~10 linhas.

---

## File Structure

| Arquivo                                      | Ação        | Responsabilidade                                                                                                                            |
| -------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/date-utils.ts`          | **Create**  | Pure functions: `parseFlexibleDate`, `normalizeToMask`, `formatDateToBR`, helpers internos `isLeapYear`, `isValidDate`, `applyCenturyPivot` |
| `packages/shared/src/date-utils.spec.ts`     | **Create**  | Unit tests cobrindo todos formatos, edge cases, regra de século, bissexto                                                                   |
| `packages/shared/src/index.ts`               | **Modify**  | Exportar `parseFlexibleDate`, `normalizeToMask`, `formatDateToBR`                                                                           |
| `apps/web/src/components/ui/date-picker.tsx` | **Rewrite** | Input híbrido: `InputMask` + botão Calendar + onPaste/onBlur handlers                                                                       |

---

## Task 1: Criar `@repo/shared/date-utils.ts` com `isLeapYear` + `isValidDate`

**Files:**

- Create: `packages/shared/src/date-utils.ts`
- Create: `packages/shared/src/date-utils.spec.ts`

- [ ] **Step 1: Escrever os testes falhando**

```ts
// packages/shared/src/date-utils.spec.ts
import { describe, expect, it } from 'vitest'
import { isLeapYear, isValidDate } from './date-utils.js'

describe('isLeapYear', () => {
  it('returns true for year divisible by 4 but not 100', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(1996)).toBe(true)
  })

  it('returns false for year divisible by 100 but not 400', () => {
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2100)).toBe(false)
  })

  it('returns true for year divisible by 400', () => {
    expect(isLeapYear(2000)).toBe(true)
  })

  it('returns false for non-leap years', () => {
    expect(isLeapYear(2023)).toBe(false)
    expect(isLeapYear(1990)).toBe(false)
  })
})

describe('isValidDate', () => {
  it('accepts valid ordinary dates', () => {
    expect(isValidDate(1, 1, 1990)).toBe(true)
    expect(isValidDate(31, 12, 2024)).toBe(true)
    expect(isValidDate(28, 2, 2023)).toBe(true)
  })

  it('accepts Feb 29 on leap years', () => {
    expect(isValidDate(29, 2, 2024)).toBe(true)
    expect(isValidDate(29, 2, 2000)).toBe(true)
  })

  it('rejects Feb 29 on non-leap years', () => {
    expect(isValidDate(29, 2, 2023)).toBe(false)
    expect(isValidDate(29, 2, 1900)).toBe(false)
  })

  it('rejects impossible month/day combinations', () => {
    expect(isValidDate(31, 4, 2024)).toBe(false)
    expect(isValidDate(31, 2, 2024)).toBe(false)
    expect(isValidDate(32, 1, 2024)).toBe(false)
    expect(isValidDate(0, 1, 2024)).toBe(false)
    expect(isValidDate(1, 13, 2024)).toBe(false)
    expect(isValidDate(1, 0, 2024)).toBe(false)
  })

  it('rejects years outside acceptable range', () => {
    expect(isValidDate(1, 1, 1899)).toBe(false)
    const farFuture = new Date().getFullYear() + 11
    expect(isValidDate(1, 1, farFuture)).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar o teste para verificar falha**

```bash
pnpm --filter @repo/shared exec vitest run src/date-utils.spec.ts
```

Expected: FAIL — `Cannot find module './date-utils.js'`

- [ ] **Step 3: Implementar `isLeapYear` e `isValidDate`**

```ts
// packages/shared/src/date-utils.ts

export function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true
  if (year % 100 === 0) return false
  return year % 4 === 0
}

export function isValidDate(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) return false
  if (day < 1) return false
  const currentYear = new Date().getFullYear()
  if (year < 1900 || year > currentYear + 10) return false

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  return day <= daysInMonth[month - 1]
}
```

- [ ] **Step 4: Rodar o teste para verificar sucesso**

```bash
pnpm --filter @repo/shared exec vitest run src/date-utils.spec.ts
```

Expected: PASS (11+ tests, 2 describes)

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/date-utils.ts packages/shared/src/date-utils.spec.ts
git commit -m "feat(shared): add isLeapYear and isValidDate helpers for SCRUM-52"
```

---

## Task 2: Adicionar `applyCenturyPivot` (regra 2-dígitos)

**Files:**

- Modify: `packages/shared/src/date-utils.ts`
- Modify: `packages/shared/src/date-utils.spec.ts`

- [ ] **Step 1: Adicionar testes falhando**

Append no `date-utils.spec.ts`:

```ts
import { isLeapYear, isValidDate, applyCenturyPivot } from './date-utils.js'

describe('applyCenturyPivot', () => {
  it('maps years >= 30 to 19xx', () => {
    expect(applyCenturyPivot(30)).toBe(1930)
    expect(applyCenturyPivot(99)).toBe(1999)
    expect(applyCenturyPivot(75)).toBe(1975)
  })

  it('maps years < 30 to 20xx', () => {
    expect(applyCenturyPivot(0)).toBe(2000)
    expect(applyCenturyPivot(29)).toBe(2029)
    expect(applyCenturyPivot(15)).toBe(2015)
  })
})
```

**Nota:** o `import` acima substitui o import existente de `./date-utils.js` no topo do arquivo de teste. Ajuste a linha de import já presente em vez de duplicar.

- [ ] **Step 2: Rodar o teste para verificar falha**

```bash
pnpm --filter @repo/shared exec vitest run src/date-utils.spec.ts
```

Expected: FAIL — `applyCenturyPivot is not a function`

- [ ] **Step 3: Implementar `applyCenturyPivot`**

Append no `date-utils.ts`:

```ts
const CENTURY_PIVOT = 30

export function applyCenturyPivot(twoDigitYear: number): number {
  if (twoDigitYear >= CENTURY_PIVOT) return 1900 + twoDigitYear
  return 2000 + twoDigitYear
}
```

- [ ] **Step 4: Rodar o teste para verificar sucesso**

```bash
pnpm --filter @repo/shared exec vitest run src/date-utils.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/date-utils.ts packages/shared/src/date-utils.spec.ts
git commit -m "feat(shared): add applyCenturyPivot for 2-digit year handling"
```

---

## Task 3: Implementar `parseFlexibleDate`

**Files:**

- Modify: `packages/shared/src/date-utils.ts`
- Modify: `packages/shared/src/date-utils.spec.ts`

- [ ] **Step 1: Adicionar testes falhando**

```ts
// Ajustar import no topo:
// import { ..., parseFlexibleDate } from './date-utils.js'

describe('parseFlexibleDate', () => {
  it('parses DD/MM/AAAA', () => {
    const d = parseFlexibleDate('01/01/1990')
    expect(d).toEqual(new Date(Date.UTC(1990, 0, 1)))
  })

  it('parses DD-MM-AAAA', () => {
    const d = parseFlexibleDate('15-03-2024')
    expect(d).toEqual(new Date(Date.UTC(2024, 2, 15)))
  })

  it('parses DDMMAAAA (sem separador)', () => {
    const d = parseFlexibleDate('01011990')
    expect(d).toEqual(new Date(Date.UTC(1990, 0, 1)))
  })

  it('parses DDMMAA (sem separador, pivot 30 → 1930)', () => {
    const d = parseFlexibleDate('010130')
    expect(d).toEqual(new Date(Date.UTC(1930, 0, 1)))
  })

  it('parses DDMMAA (sem separador, pivot 29 → 2029)', () => {
    const d = parseFlexibleDate('010129')
    expect(d).toEqual(new Date(Date.UTC(2029, 0, 1)))
  })

  it('trims leading/trailing whitespace', () => {
    expect(parseFlexibleDate('  01/01/1990  ')).toEqual(
      new Date(Date.UTC(1990, 0, 1))
    )
  })

  it('returns null for empty input', () => {
    expect(parseFlexibleDate('')).toBeNull()
    expect(parseFlexibleDate('   ')).toBeNull()
  })

  it('returns null for invalid dates', () => {
    expect(parseFlexibleDate('32/13/2020')).toBeNull()
    expect(parseFlexibleDate('29/02/2023')).toBeNull()
    expect(parseFlexibleDate('31/04/2024')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseFlexibleDate('abc')).toBeNull()
    expect(parseFlexibleDate('aa/bb/cccc')).toBeNull()
  })

  it('returns null for ambiguous short input with separator (DD/MM/AA)', () => {
    expect(parseFlexibleDate('01/01/19')).toBeNull()
  })

  it('returns null for ISO format (AAAA-MM-DD) — out of scope', () => {
    expect(parseFlexibleDate('1990-01-01')).toBeNull()
  })

  it('returns null for input with text around date', () => {
    expect(parseFlexibleDate('Nascido em 01/01/1990')).toBeNull()
  })

  it('returns null for year outside acceptable range', () => {
    expect(parseFlexibleDate('01/01/1800')).toBeNull()
  })

  it('accepts Feb 29 on leap year', () => {
    const d = parseFlexibleDate('29/02/2024')
    expect(d).toEqual(new Date(Date.UTC(2024, 1, 29)))
  })
})
```

- [ ] **Step 2: Rodar o teste para verificar falha**

```bash
pnpm --filter @repo/shared exec vitest run src/date-utils.spec.ts
```

Expected: FAIL — `parseFlexibleDate is not a function`

- [ ] **Step 3: Implementar `parseFlexibleDate`**

Append no `date-utils.ts`:

```ts
const DIGITS_ONLY = /^\d+$/
const SEPARATED = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/

export function parseFlexibleDate(input: string): Date | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  const digitsMatch = trimmed.match(DIGITS_ONLY)
  if (digitsMatch) {
    if (trimmed.length === 8) {
      return parseDigits(
        trimmed.slice(0, 2),
        trimmed.slice(2, 4),
        trimmed.slice(4, 8)
      )
    }
    if (trimmed.length === 6) {
      const day = trimmed.slice(0, 2)
      const month = trimmed.slice(2, 4)
      const year = applyCenturyPivot(Number(trimmed.slice(4, 6)))
      return parseDigits(day, month, String(year))
    }
    return null
  }

  const separated = trimmed.match(SEPARATED)
  if (!separated) return null
  const [, day, month, yearPart] = separated
  if (yearPart.length === 2) return null
  return parseDigits(day, month, yearPart)
}

function parseDigits(
  dayStr: string,
  monthStr: string,
  yearStr: string
): Date | null {
  const day = Number(dayStr)
  const month = Number(monthStr)
  const year = Number(yearStr)
  if (!isValidDate(day, month, year)) return null
  return new Date(Date.UTC(year, month - 1, day))
}
```

- [ ] **Step 4: Rodar o teste para verificar sucesso**

```bash
pnpm --filter @repo/shared exec vitest run src/date-utils.spec.ts
```

Expected: PASS (todos os testes de `parseFlexibleDate`)

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/date-utils.ts packages/shared/src/date-utils.spec.ts
git commit -m "feat(shared): add parseFlexibleDate supporting multiple BR formats"
```

---

## Task 4: Implementar `normalizeToMask`

**Files:**

- Modify: `packages/shared/src/date-utils.ts`
- Modify: `packages/shared/src/date-utils.spec.ts`

- [ ] **Step 1: Adicionar testes falhando**

```ts
// Ajustar import: adicionar normalizeToMask

describe('normalizeToMask', () => {
  it('inserts slashes into 8-digit input', () => {
    expect(normalizeToMask('01011990')).toBe('01/01/1990')
  })

  it('inserts slashes into 6-digit input', () => {
    expect(normalizeToMask('010130')).toBe('01/01/30')
  })

  it('replaces hyphens with slashes', () => {
    expect(normalizeToMask('01-01-1990')).toBe('01/01/1990')
  })

  it('preserves already-formatted input', () => {
    expect(normalizeToMask('01/01/1990')).toBe('01/01/1990')
  })

  it('strips non-date characters', () => {
    expect(normalizeToMask('abc01011990xyz')).toBe('01/01/1990')
  })

  it('strips whitespace', () => {
    expect(normalizeToMask('  01/01/1990  ')).toBe('01/01/1990')
  })

  it('handles datetime suffix by truncating to date only', () => {
    expect(normalizeToMask('01/01/1990 10:30')).toBe('01/01/1990')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeToMask('')).toBe('')
  })

  it('returns partial digits when length is not 6 or 8', () => {
    expect(normalizeToMask('0101')).toBe('0101')
    expect(normalizeToMask('010')).toBe('010')
  })

  it('truncates to 10 chars max (DD/MM/AAAA)', () => {
    expect(normalizeToMask('01/01/19901234')).toBe('01/01/1990')
  })
})
```

- [ ] **Step 2: Rodar o teste para verificar falha**

```bash
pnpm --filter @repo/shared exec vitest run src/date-utils.spec.ts
```

Expected: FAIL — `normalizeToMask is not a function`

- [ ] **Step 3: Implementar `normalizeToMask`**

Append no `date-utils.ts`:

```ts
const VALID_MASK_CHARS = /[^\d/-]/g

export function normalizeToMask(input: string): string {
  if (!input) return ''
  const cleaned = input.replace(VALID_MASK_CHARS, '').replace(/-/g, '/')

  if (DIGITS_ONLY.test(cleaned)) {
    if (cleaned.length === 8) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`
    }
    if (cleaned.length === 6) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 6)}`
    }
    return cleaned
  }

  return cleaned.slice(0, 10)
}
```

- [ ] **Step 4: Rodar o teste para verificar sucesso**

```bash
pnpm --filter @repo/shared exec vitest run src/date-utils.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/date-utils.ts packages/shared/src/date-utils.spec.ts
git commit -m "feat(shared): add normalizeToMask for paste input normalization"
```

---

## Task 5: Implementar `formatDateToBR`

**Files:**

- Modify: `packages/shared/src/date-utils.ts`
- Modify: `packages/shared/src/date-utils.spec.ts`

- [ ] **Step 1: Adicionar testes falhando**

```ts
// Ajustar import: adicionar formatDateToBR

describe('formatDateToBR', () => {
  it('formats Date to DD/MM/AAAA with zero padding', () => {
    const date = new Date(Date.UTC(1990, 0, 1))
    expect(formatDateToBR(date)).toBe('01/01/1990')
  })

  it('formats multi-digit day/month', () => {
    const date = new Date(Date.UTC(2026, 2, 15))
    expect(formatDateToBR(date)).toBe('15/03/2026')
  })

  it('uses UTC to avoid timezone drift', () => {
    const date = new Date(Date.UTC(2024, 11, 31))
    expect(formatDateToBR(date)).toBe('31/12/2024')
  })
})
```

- [ ] **Step 2: Rodar o teste para verificar falha**

```bash
pnpm --filter @repo/shared exec vitest run src/date-utils.spec.ts
```

Expected: FAIL — `formatDateToBR is not a function`

- [ ] **Step 3: Implementar `formatDateToBR`**

Append no `date-utils.ts`:

```ts
export function formatDateToBR(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}
```

- [ ] **Step 4: Rodar o teste para verificar sucesso**

```bash
pnpm --filter @repo/shared exec vitest run src/date-utils.spec.ts
```

Expected: PASS (todos os testes de todas as 6 describes)

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/date-utils.ts packages/shared/src/date-utils.spec.ts
git commit -m "feat(shared): add formatDateToBR for display formatting"
```

---

## Task 6: Exportar de `@repo/shared` e adicionar subpath export

**Files:**

- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/package.json:7-13`

- [ ] **Step 1: Adicionar exports no `index.ts`**

Append ao final do arquivo `packages/shared/src/index.ts`:

```ts
export {
  isLeapYear,
  isValidDate,
  applyCenturyPivot,
  parseFlexibleDate,
  normalizeToMask,
  formatDateToBR,
} from './date-utils.js'
```

- [ ] **Step 2: Adicionar subpath export no `package.json`**

Modificar o bloco `"exports"` em `packages/shared/package.json`:

```json
"exports": {
  ".": "./src/index.ts",
  "./api-types": "./src/api-types.ts",
  "./socket-events": "./src/socket-events.ts",
  "./sentry-pii": "./src/sentry-pii.ts",
  "./pino-redact": "./src/pino-redact.ts",
  "./meta-crypto": "./src/meta-crypto.ts",
  "./date-utils": "./src/date-utils.ts"
}
```

- [ ] **Step 3: Verificar typecheck do package**

```bash
pnpm --filter @repo/shared typecheck 2>/dev/null || pnpm typecheck --filter @repo/shared
```

Expected: zero errors (caso não exista script `typecheck` no package, rodar `pnpm typecheck` na raiz)

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/index.ts packages/shared/package.json
git commit -m "feat(shared): export date-utils from @repo/shared"
```

---

## Task 7: Reescrever `DatePicker` — estrutura base com InputMask

**Files:**

- Modify: `apps/web/src/components/ui/date-picker.tsx` (rewrite)

- [ ] **Step 1: Substituir o conteúdo completo do arquivo**

```tsx
// apps/web/src/components/ui/date-picker.tsx
'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { InputMask } from '@react-input/mask'
import { ptBR } from 'date-fns/locale'
import {
  parseFlexibleDate,
  normalizeToMask,
  formatDateToBR,
} from '@repo/shared/date-utils'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  readonly value?: Date
  readonly onChange: (date: Date | undefined) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly className?: string
  readonly id?: string
}

const MASK_REPLACEMENT = { _: /\d/ } as const

export function DatePicker({
  value,
  onChange,
  placeholder = 'DD/MM/AAAA',
  disabled,
  className,
  id,
}: DatePickerProps): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [textValue, setTextValue] = React.useState(
    value ? formatDateToBR(value) : ''
  )
  const [localError, setLocalError] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Sync prop value → textValue
  React.useEffect(() => {
    setTextValue(value ? formatDateToBR(value) : '')
    setLocalError(false)
  }, [value])

  // Click outside closes popover
  React.useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        requestAnimationFrame(() => setOpen(false))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTextValue(event.target.value)
    setLocalError(false)
  }

  function handleBlur() {
    const trimmed = textValue.trim()
    if (!trimmed) {
      setLocalError(false)
      if (value !== undefined) onChange(undefined)
      return
    }
    const parsed = parseFlexibleDate(trimmed)
    if (!parsed) {
      setLocalError(true)
      if (value !== undefined) onChange(undefined)
      return
    }
    setLocalError(false)
    setTextValue(formatDateToBR(parsed))
    onChange(parsed)
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text')
    if (!pasted) return
    event.preventDefault()
    const normalized = normalizeToMask(pasted)
    setTextValue(normalized)
    const parsed = parseFlexibleDate(normalized)
    if (parsed) {
      setLocalError(false)
      setTextValue(formatDateToBR(parsed))
      onChange(parsed)
      return
    }
    setLocalError(true)
    if (value !== undefined) onChange(undefined)
  }

  function handleFocus(event: React.FocusEvent<HTMLInputElement>) {
    if (value) event.target.select()
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (!date) return
    setOpen(false)
    setLocalError(false)
    setTextValue(formatDateToBR(date))
    onChange(date)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <InputMask
        component={Input}
        mask="__/__/____"
        replacement={MASK_REPLACEMENT}
        value={textValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="numeric"
        id={id}
        aria-invalid={localError || undefined}
        aria-describedby={localError ? `${id ?? 'date'}-error` : undefined}
        ref={inputRef}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Abrir calendário"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground pointer-events-auto absolute right-2 top-1/2 z-10 -translate-y-1/2 disabled:opacity-50"
      >
        <CalendarIcon className="size-4" />
      </button>
      {localError && (
        <span
          id={`${id ?? 'date'}-error`}
          className="text-destructive mt-1 block text-xs"
        >
          Data inválida
        </span>
      )}
      {open && (
        <div className="bg-popover absolute left-0 top-full z-50 mt-1 rounded-xl border p-2 shadow-lg">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            startMonth={new Date(1920, 0)}
            endMonth={new Date(new Date().getFullYear() + 10, 11)}
            selected={value}
            onSelect={handleCalendarSelect}
            locale={ptBR}
            defaultMonth={value}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rodar typecheck e lint do web app**

```bash
pnpm --filter @app/web typecheck
pnpm --filter @app/web lint
```

Expected: zero errors.

Se houver erro "Cannot find module '@repo/shared/date-utils'": rodar `pnpm install` na raiz para refrescar workspace symlinks.

- [ ] **Step 3: Rodar build do web app**

```bash
pnpm --filter @app/web build
```

Expected: build completes successfully.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/date-picker.tsx
git commit -m "feat(web): rewrite DatePicker as hybrid masked input (SCRUM-52)"
```

---

## Task 8: Quality Gates globais

**Files:** (nenhum arquivo alterado — só validação)

- [ ] **Step 1: Rodar todas as quality gates da raiz**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Expected: todas zero errors, suite completa de `@repo/shared` passando (incluindo 40+ novos testes de `date-utils.spec.ts`).

Se algum teste falhar: diagnosticar (usar skill `systematic-debugging`), corrigir, re-rodar. Não pular.

---

## Task 9: QA Playwright — exercitar novo DatePicker

**Files:** (cria screenshots em `audit/SCRUM-52/`)

- [ ] **Step 1: Levantar ambiente**

```bash
docker compose up -d
pnpm dev
```

Esperar logs "ready" em web :3000 e server :3001.

- [ ] **Step 2: Fluxo Playwright MCP — cliente (birthDate)**

Via MCP Playwright:

1. Navigate `http://localhost:3000/login`, login `test@user.com` / `Senha@123`.
2. Navigate para página de criação de cliente (`/clientes/novo` ou equivalente).
3. Screenshot base: `audit/SCRUM-52/01-client-form-empty.png`.
4. Click no campo "Data de nascimento", **digitar** `15/03/1990`, tab para próximo campo. Verificar: input mostra `15/03/1990`, sem erro visual. Screenshot: `02-typed-valid.png`.
5. Limpar o campo, **colar** (`browser_evaluate` simulando clipboard `01011990`) e dar tab. Verificar: input mostra `01/01/1990`. Screenshot: `03-pasted-no-separator.png`.
6. Limpar, **colar** `01-01-1990`. Verificar: normaliza para `01/01/1990`. Screenshot: `04-pasted-hyphens.png`.
7. Limpar, **digitar** `32/13/2020`, tab. Verificar: borda vermelha, mensagem "Data inválida" abaixo. Screenshot: `05-invalid-feedback.png`.
8. Limpar tudo, tab. Verificar: sem erro (campo vazio é estado válido). Screenshot: `06-empty-no-error.png`.
9. Clicar no ícone de calendário. Verificar: popover abre. Selecionar qualquer dia. Verificar: input preenche, popover fecha. Screenshot: `07-calendar-picker.png`.
10. Preencher demais campos obrigatórios e submeter. Verificar: cliente criado, redirect para lista/detalhe.

- [ ] **Step 3: Fluxo Playwright MCP — apólice (startDate/endDate)**

1. Navigate para fluxo de emissão de apólice.
2. Verificar dois campos de data (startDate, endDate) funcionam com paste + digitação independentes.
3. Screenshot: `08-policy-dates.png`.

- [ ] **Step 4: Mobile + dark mode**

1. Resize para 375px via `browser_resize`.
2. Repetir step 2.4 + 2.7 em mobile. Verificar: layout OK, `inputMode="numeric"` abre teclado numérico (verificar via devtools se keyboard hint aparece).
3. Screenshot: `09-mobile.png`.
4. Ativar dark mode via toggle do app. Screenshot: `10-dark-mode.png`.

- [ ] **Step 5: Verificar console sem erros**

Via `browser_console_messages`. Expected: sem errors/warnings novos relacionados ao DatePicker.

- [ ] **Step 6: Se QA reprovar: voltar à Task afetada, corrigir, re-rodar QA**

Não pular nenhum caso. Após QA aprovar, prosseguir.

---

## Task 10: Atualizar spec com ajustes do planejamento

**Files:**

- Modify: `docs/superpowers/specs/2026-04-15-flexible-date-input-design.md`

- [ ] **Step 1: Atualizar seção "API pública" da spec**

Substituir o bloco de interface na seção 5.2 pela API real:

```ts
interface DatePickerProps {
  readonly value?: Date
  readonly onChange: (date: Date | undefined) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly className?: string
  readonly id?: string
}
```

E ajustar prosa adjacente: "`value` é `Date | undefined`; consumers continuam convertendo ISO↔Date no boundary via `parseDateString`/`formatDateToISO` locais."

- [ ] **Step 2: Atualizar seção 7.1 — testes em `@repo/shared`**

Trocar path `lib/date-utils.spec.ts` por `packages/shared/src/date-utils.spec.ts`. Remover referência a "apps/web testing" — componente é coberto por QA Playwright.

- [ ] **Step 3: Commit da atualização**

```bash
git add docs/superpowers/specs/2026-04-15-flexible-date-input-design.md
git commit -m "docs(specs): sync flexible-date spec with implementation details"
```

---

## Task 11: Transicionar SCRUM-52 no Jira

**Files:** (nenhum — ação externa via MCP)

- [ ] **Step 1: Adicionar comentário resumindo implementação**

Via MCP Atlassian `addCommentToJiraIssue`:

> Implementação completa. DatePicker reescrito como input mascarado híbrido (paste + digitação + calendário). Parser em `@repo/shared/date-utils` com suporte a `DD/MM/AAAA`, `DD-MM-AAAA`, `DDMMAAAA`, `DDMMAA` (pivô 30). Consumers não mudam. Testes unitários em vitest + QA Playwright aprovado.

- [ ] **Step 2: Transicionar para "Em revisão" ou equivalente**

Via MCP `getTransitionsForJiraIssue` para listar status disponíveis, depois `transitionJiraIssue`.

---

## Self-Review

**Spec coverage:**

- ✅ Requisito 1 (paste direto) → Task 7 (handlePaste) + Task 4 (normalizeToMask)
- ✅ Requisito 2 (reconhecer formato e validar) → Task 3 (parseFlexibleDate)
- ✅ Requisito 3 (preenche se correto) → Task 7 (handleBlur/handlePaste caminho válido)
- ✅ Requisito 4 (erro amigável se inválido) → Task 7 (localError + mensagem)
- ✅ Consistência em todos os campos de data → API preservada, consumers herdam (Task 7)
- ✅ Seletor de datas continua funcionando → Task 7 (Calendar popover intacto)
- ✅ Formatos DD/MM/AAAA, sem separadores, com/sem máscara → Tasks 3 + 4
- ✅ Validar datas impossíveis → Task 1 (isValidDate) + Task 3 (parseFlexibleDate retorna null)
- ✅ Testes unitários → Tasks 1–5
- ✅ QA em mobile + dark mode → Task 9.4
- ✅ Acessibilidade (aria-invalid, aria-describedby, aria-label) → Task 7 Step 1

**Placeholder scan:** nenhum "TBD"/"TODO"/"similar to above"; todo step tem código concreto.

**Type consistency:** `parseFlexibleDate(input: string): Date | null` usado consistentemente; `formatDateToBR(date: Date): string` idem. Nome das funções bate entre spec, código de implementação e testes. API do componente idêntica entre Task 7 e consumers existentes.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-15-flexible-date-input.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.
