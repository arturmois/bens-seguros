# SCRUM-35: Cotação Vida - Altura, Peso e IMC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional height (cm) and weight (grams) fields to the life insurance quotation form, with real-time BMI badge.

**Architecture:** Extend the existing `LifeDetails` discriminated union across 4 layers (Zod server schema, core domain type, frontend type, frontend form). IMC is computed client-side only, never persisted. No Prisma migration needed — data lives in the JSON `Proposal.details` column.

**Tech Stack:** TypeScript, Zod, React Hook Form, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-26-cotacao-vida-altura-peso-design.md`

---

### Task 1: Add fields to server Zod schema

**Files:**

- Modify: `apps/server/src/schemas/proposal-details.schemas.ts:46-53`

- [ ] **Step 1: Add the two optional fields to `lifeDetailsSchema`**

In `apps/server/src/schemas/proposal-details.schemas.ts`, add after line 51 (`esportesRadicais`):

```typescript
const lifeDetailsSchema = z.object({
  branch: z.literal('LIFE'),
  profissao: z.string().min(1),
  rendaMensalCentavos: z.number().int().min(0).optional(),
  fumante: z.boolean().optional(),
  esportesRadicais: z.boolean().optional(),
  alturaEmCentimetros: z.number().int().min(100).max(250).optional(),
  pesoEmGramas: z.number().int().min(20000).max(300000).optional(),
  beneficiarios: z.string().optional(),
})
```

- [ ] **Step 2: Verify the server compiles**

Run: `pnpm --filter server typecheck`
Expected: success, zero errors

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/schemas/proposal-details.schemas.ts
git commit -m "feat(proposal): add altura and peso to life Zod schema (SCRUM-35)"
```

---

### Task 2: Add fields to core domain type

**Files:**

- Modify: `packages/core/src/modules/proposal/domain/insured-object-details.ts:44-51`

- [ ] **Step 1: Add fields to `LifeDetails` interface**

In `packages/core/src/modules/proposal/domain/insured-object-details.ts`, update the `LifeDetails` interface:

```typescript
export interface LifeDetails {
  branch: 'LIFE'
  profissao: string
  rendaMensalCentavos?: number
  fumante?: boolean
  esportesRadicais?: boolean
  alturaEmCentimetros?: number
  pesoEmGramas?: number
  beneficiarios?: string
}
```

- [ ] **Step 2: Verify core compiles**

Run: `pnpm --filter @repo/core typecheck`
Expected: success, zero errors

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/proposal/domain/insured-object-details.ts
git commit -m "feat(core): add altura and peso to LifeDetails domain type (SCRUM-35)"
```

---

### Task 3: Add fields to frontend type

**Files:**

- Modify: `apps/web/src/features/proposals/types/index.ts:63-70`

- [ ] **Step 1: Add fields to frontend `LifeDetails` interface**

In `apps/web/src/features/proposals/types/index.ts`, update the `LifeDetails` interface:

```typescript
export interface LifeDetails {
  branch: 'LIFE'
  profissao: string
  rendaMensalCentavos?: number
  fumante?: boolean
  esportesRadicais?: boolean
  alturaEmCentimetros?: number
  pesoEmGramas?: number
  beneficiarios?: string
}
```

- [ ] **Step 2: Verify web compiles**

Run: `pnpm --filter web typecheck`
Expected: success, zero errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/types/index.ts
git commit -m "feat(web): add altura and peso to frontend LifeDetails type (SCRUM-35)"
```

---

### Task 4: Update `buildDetails` to include new fields

**Files:**

- Modify: `apps/web/src/features/proposals/components/branch-fields.tsx:100-112`

- [ ] **Step 1: Add new fields to the LIFE case in `buildDetails`**

In `apps/web/src/features/proposals/components/branch-fields.tsx`, replace the `case 'LIFE':` block (lines 100-112):

```typescript
    case 'LIFE':
      return {
        branch,
        profissao: String(fields.profissao ?? ''),
        rendaMensalCentavos: fields.rendaMensalCentavos
          ? Number(fields.rendaMensalCentavos)
          : undefined,
        fumante: fields.fumante === true ? true : undefined,
        esportesRadicais: fields.esportesRadicais === true ? true : undefined,
        alturaEmCentimetros: fields.alturaEmCentimetros
          ? Number(fields.alturaEmCentimetros)
          : undefined,
        pesoEmGramas: fields.pesoEmGramas
          ? Number(fields.pesoEmGramas)
          : undefined,
        beneficiarios: fields.beneficiarios
          ? String(fields.beneficiarios)
          : undefined,
      }
```

- [ ] **Step 2: Verify web compiles**

Run: `pnpm --filter web typecheck`
Expected: success, zero errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/components/branch-fields.tsx
git commit -m "feat(web): include altura/peso in buildDetails for LIFE branch (SCRUM-35)"
```

---

### Task 5: Add height, weight inputs and IMC badge to LifeFields

**Files:**

- Modify: `apps/web/src/features/proposals/components/branch-field-sets.tsx:134-178`

- [ ] **Step 1: Add `useWatch` import and update LifeFields**

In `apps/web/src/features/proposals/components/branch-field-sets.tsx`:

1. Update the react-hook-form import at line 3:

```typescript
import type { Control, FieldValues, UseFormRegister } from 'react-hook-form'
import { Controller, useWatch } from 'react-hook-form'
```

2. Replace the entire `LifeFields` function (lines 134-178) with:

```typescript
const IMC_RANGES = [
  { max: 18.5, label: 'Abaixo do peso', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950' },
  { max: 25, label: 'Normal', color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950' },
  { max: 30, label: 'Sobrepeso', color: 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950' },
  { max: Infinity, label: 'Obesidade', color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950' },
] as const

function ImcBadge({ control }: { readonly control: Control<FieldValues> }) {
  const altura = useWatch({ control, name: 'alturaEmCentimetros' })
  const peso = useWatch({ control, name: 'pesoEmGramas' })

  const alturaNum = Number(altura)
  const pesoNum = Number(peso)

  if (!alturaNum || !pesoNum || alturaNum < 100 || alturaNum > 250 || pesoNum < 20000 || pesoNum > 300000) {
    return null
  }

  const alturaM = alturaNum / 100
  const pesoKg = pesoNum / 1000
  const imc = pesoKg / (alturaM * alturaM)
  const range = IMC_RANGES.find((r) => imc < r.max)

  if (!range) return null

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ${range.color}`}>
      IMC: {imc.toFixed(1)} — {range.label}
    </div>
  )
}

export function LifeFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Profissão" required>
        <Input placeholder="Profissão do segurado" {...register('profissao')} />
      </FieldWrapper>
      <FieldWrapper label="Renda Mensal (centavos)">
        <Input
          type="number"
          placeholder="Ex: 500000 = R$ 5.000"
          {...register('rendaMensalCentavos', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Fumante">
        <Controller
          name="fumante"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value === true}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Esportes Radicais">
        <Controller
          name="esportesRadicais"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value === true}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Altura (cm)">
        <Input
          type="number"
          placeholder="175"
          {...register('alturaEmCentimetros', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Peso (kg)" hint="Em gramas internamente (ex: 70.5 kg = 70500)">
        <Input
          type="number"
          placeholder="70500"
          {...register('pesoEmGramas', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <div className="sm:col-span-2">
        <ImcBadge control={control} />
      </div>
      <FieldWrapper label="Beneficiários">
        <Textarea
          placeholder="Nomes e parentesco dos beneficiários"
          {...register('beneficiarios')}
        />
      </FieldWrapper>
    </>
  )
}
```

- [ ] **Step 2: Verify web compiles**

Run: `pnpm --filter web typecheck`
Expected: success, zero errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/components/branch-field-sets.tsx
git commit -m "feat(web): add altura, peso inputs and IMC badge to LifeFields (SCRUM-35)"
```

---

### Task 6: Smoke test and final verification

- [ ] **Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: success across all packages

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: zero errors

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: successful build

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: all existing tests pass (no regressions)

- [ ] **Step 5: Manual QA via Playwright**

1. Navigate to an existing LIFE proposal in the app
2. Verify the "Dados do Segurado" section shows the new Altura and Peso fields
3. Enter valid values (e.g., altura=175, peso=70500) and confirm IMC badge appears: `IMC: 23.0 — Normal`
4. Enter only altura without peso — IMC badge should NOT appear
5. Submit the form and verify data persists on reload
6. Verify fields are optional — form submits without them filled
