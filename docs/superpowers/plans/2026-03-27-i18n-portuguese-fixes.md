# i18n Portuguese Fixes & Language Standardization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix ~73 Portuguese accent/cedilla errors in frontend UI strings and rename 33 Portuguese backend properties to English across all consumers.

**Architecture:** Two independent workstreams — (1) backend property renaming cascading from domain interfaces through Zod schemas, mappers, forms, PDF templates, and tests; (2) frontend display string fixes in marketing pages, validation schemas, forms, dialogs, and chat components.

**Tech Stack:** TypeScript interfaces, Zod schemas, React Hook Form, @react-pdf/renderer

---

## File Map

### Backend Property Renaming (Workstream 1)

| File                                                                             | Action | Responsibility                                 |
| -------------------------------------------------------------------------------- | ------ | ---------------------------------------------- |
| `packages/core/src/modules/proposal/domain/insured-object-details.ts`            | Modify | Domain interfaces — source of truth            |
| `apps/server/src/schemas/proposal-details.schemas.ts`                            | Modify | Zod API validation schemas                     |
| `apps/web/src/features/proposals/types/index.ts`                                 | Modify | Frontend type re-exports                       |
| `apps/web/src/features/proposals/components/branch-fields.tsx`                   | Modify | `buildDetails()` mapping function              |
| `apps/web/src/features/proposals/components/branch-field-sets.tsx`               | Modify | Auto, Life, Other form fields + constants      |
| `apps/web/src/features/proposals/components/branch-field-sets-property.tsx`      | Modify | Residential, Condominium, Business form fields |
| `apps/web/src/features/proposals/lib/branch-options.ts`                          | Modify | Option constants naming                        |
| `apps/server/src/pdf-templates/insured-object-section.tsx`                       | Modify | PDF template property access                   |
| `packages/core/src/modules/proposal/domain/proposal.spec.ts`                     | Modify | Domain entity test fixtures                    |
| `packages/core/src/modules/proposal/application/update-proposal-details.spec.ts` | Modify | Use case test fixtures                         |

### Frontend Display String Fixes (Workstream 2)

| File                                                                      | Action | Responsibility            |
| ------------------------------------------------------------------------- | ------ | ------------------------- |
| `apps/web/src/features/marketing/components/marketing-nav.tsx`            | Modify | Nav links                 |
| `apps/web/src/features/marketing/components/marketing-footer.tsx`         | Modify | Footer links              |
| `apps/web/src/features/marketing/components/hero-content.tsx`             | Modify | Hero text                 |
| `apps/web/src/features/marketing/components/how-it-works-section.tsx`     | Modify | How it works descriptions |
| `apps/web/src/features/marketing/components/features-section.tsx`         | Modify | Feature descriptions      |
| `apps/web/src/features/marketing/components/pricing-section.tsx`          | Modify | Pricing text              |
| `apps/web/src/features/marketing/components/problem-section.tsx`          | Modify | Problem section text      |
| `apps/web/src/features/marketing/components/testimonials-section.tsx`     | Modify | Testimonials text         |
| `apps/web/src/features/marketing/components/faq-cta-section.tsx`          | Modify | FAQ answers and CTA       |
| `apps/web/src/app/(marketing)/layout.tsx`                                 | Modify | Marketing layout metadata |
| `apps/web/src/features/auth/components/login-form.tsx`                    | Modify | Validation messages       |
| `apps/web/src/features/auth/components/register-form.tsx`                 | Modify | Validation messages       |
| `apps/web/src/features/clients/lib/schemas.ts`                            | Modify | Client form validation    |
| `apps/web/src/features/clients/components/client-form-fields.tsx`         | Modify | Form labels               |
| `apps/web/src/features/clients/components/client-form.tsx`                | Modify | Form description          |
| `apps/web/src/features/clients/components/import-dialog.tsx`              | Modify | Import dialog text        |
| `apps/web/src/features/clients/components/import-step-processing.tsx`     | Modify | Import processing text    |
| `apps/web/src/features/channels/lib/schemas.ts`                           | Modify | Channel validation        |
| `apps/web/src/features/channels/components/channels-page.tsx`             | Modify | Page text                 |
| `apps/web/src/features/channels/components/channel-form-sheet.tsx`        | Modify | Form text                 |
| `apps/web/src/features/channels/components/channel-qr-dialog.tsx`         | Modify | Dialog text               |
| `apps/web/src/features/channels/components/deactivate-channel-dialog.tsx` | Modify | Dialog text               |
| `apps/web/src/features/organization/components/organization-form.tsx`     | Modify | Validation messages       |
| `apps/web/src/features/organization/components/organization-page.tsx`     | Modify | Page text                 |
| `apps/web/src/features/organization/hooks/use-upload-logo.ts`             | Modify | Error messages            |
| `apps/web/src/features/members/lib/member-schemas.ts`                     | Modify | Validation messages       |
| `apps/web/src/features/ai-agents/lib/schemas.ts`                          | Modify | Validation messages       |
| `apps/web/src/features/ai-agents/components/ai-agent-form-sheet.tsx`      | Modify | Form text                 |
| `apps/web/src/features/audit/components/audit-table.tsx`                  | Modify | Column header             |
| `apps/web/src/features/chat/components/header-actions.tsx`                | Modify | Dialog text               |
| `apps/web/src/features/chat/components/transfer-agent-modal.tsx`          | Modify | Modal text                |
| `apps/web/src/features/chat/components/chat-area-states.tsx`              | Modify | Empty state text          |
| `apps/web/src/features/dashboard/components/conversion-rate.tsx`          | Modify | Chart labels              |
| `apps/web/src/features/commissions/components/commissions-table-rows.tsx` | Modify | Table text                |

---

## Task 1: Rename Domain Interfaces (Source of Truth)

**Files:**

- Modify: `packages/core/src/modules/proposal/domain/insured-object-details.ts`

- [ ] **Step 1: Rename all properties in domain interfaces**

Replace the entire file content with English property names:

```typescript
export interface AutoDetails {
  branch: 'AUTO'
  brand: string
  model: string
  manufacturingYear: number
  modelYear: number
  licensePlate?: string
  vin?: string
  color?: string
  fuelType?: string
  vehicleUsage?: string
}

export interface ResidentialDetails {
  branch: 'RESIDENTIAL'
  propertyType: string
  propertyUsage: string
  cep: string
  address?: string
  construction?: string
  areaM2?: number
}

export interface CondominiumDetails {
  branch: 'CONDOMINIUM'
  condominiumName: string
  unitCount: number
  cep: string
  address?: string
  constructionYear?: number
  floorCount?: number
}

export interface BusinessDetails {
  branch: 'BUSINESS'
  legalName: string
  cnpj: string
  businessActivity: string
  cep?: string
  address?: string
  areaM2?: number
}

export interface LifeDetails {
  branch: 'LIFE'
  occupation: string
  monthlyIncomeCents?: number
  isSmoker?: boolean
  extremeSports?: boolean
  heightInCentimeters?: number
  weightInGrams?: number
  beneficiaries?: string
}

export interface OtherDetails {
  branch: 'OTHER'
  description: string
}

export type InsuredObjectDetails =
  | AutoDetails
  | ResidentialDetails
  | CondominiumDetails
  | BusinessDetails
  | LifeDetails
  | OtherDetails

export function isInsuredObjectDetails(
  value: unknown
): value is InsuredObjectDetails {
  if (typeof value !== 'object' || value === null || !('branch' in value))
    return false
  const obj = value as Record<string, unknown>
  const branches = new Set([
    'AUTO',
    'RESIDENTIAL',
    'CONDOMINIUM',
    'BUSINESS',
    'LIFE',
    'OTHER',
  ])
  return typeof obj.branch === 'string' && branches.has(obj.branch)
}
```

- [ ] **Step 2: Verify the core package export is unchanged**

Check `packages/core/src/modules/proposal/index.ts` — it exports by type name (AutoDetails, etc.), which haven't changed. No modification needed.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/proposal/domain/insured-object-details.ts
git commit -m "refactor: rename insured object domain properties to English"
```

---

## Task 2: Update Zod Validation Schemas

**Files:**

- Modify: `apps/server/src/schemas/proposal-details.schemas.ts`

- [ ] **Step 1: Rename all Zod schema properties to match domain interfaces**

```typescript
import { z } from 'zod'

const autoDetailsSchema = z.object({
  branch: z.literal('AUTO'),
  brand: z.string().min(1),
  model: z.string().min(1),
  manufacturingYear: z.number().int().min(1900).max(2100),
  modelYear: z.number().int().min(1900).max(2100),
  licensePlate: z.string().optional(),
  vin: z.string().optional(),
  color: z.string().optional(),
  fuelType: z.string().optional(),
  vehicleUsage: z.string().optional(),
})

const residentialDetailsSchema = z.object({
  branch: z.literal('RESIDENTIAL'),
  propertyType: z.string().min(1),
  propertyUsage: z.string().min(1),
  cep: z.string().min(1),
  address: z.string().optional(),
  construction: z.string().optional(),
  areaM2: z.number().optional(),
})

const condominiumDetailsSchema = z.object({
  branch: z.literal('CONDOMINIUM'),
  condominiumName: z.string().min(1),
  unitCount: z.number().int().min(1),
  cep: z.string().min(1),
  address: z.string().optional(),
  constructionYear: z.number().int().optional(),
  floorCount: z.number().int().optional(),
})

const businessDetailsSchema = z.object({
  branch: z.literal('BUSINESS'),
  legalName: z.string().min(1),
  cnpj: z.string().min(1),
  businessActivity: z.string().min(1),
  cep: z.string().optional(),
  address: z.string().optional(),
  areaM2: z.number().optional(),
})

const lifeDetailsSchema = z.object({
  branch: z.literal('LIFE'),
  occupation: z.string().min(1),
  monthlyIncomeCents: z.number().int().min(0).optional(),
  isSmoker: z.boolean().optional(),
  extremeSports: z.boolean().optional(),
  heightInCentimeters: z.number().int().min(100).max(250).optional(),
  weightInGrams: z.number().int().min(20000).max(300000).optional(),
  beneficiaries: z.string().optional(),
})

const otherDetailsSchema = z.object({
  branch: z.literal('OTHER'),
  description: z.string().min(1),
})

export const insuredObjectDetailsSchema = z.discriminatedUnion('branch', [
  autoDetailsSchema,
  residentialDetailsSchema,
  condominiumDetailsSchema,
  businessDetailsSchema,
  lifeDetailsSchema,
  otherDetailsSchema,
])

export const updateProposalDetailsBodySchema = z.object({
  details: insuredObjectDetailsSchema,
  premiumValueInCents: z.number().int().min(0),
  commissionBasisPoints: z.number().int().min(0).max(10000),
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/schemas/proposal-details.schemas.ts
git commit -m "refactor: rename Zod proposal details schemas to English"
```

---

## Task 3: Update Frontend Type Re-exports

**Files:**

- Modify: `apps/web/src/features/proposals/types/index.ts`

- [ ] **Step 1: Update all interface property names to match domain**

Update the interface definitions in this file to match the new English property names from Task 1. The type names (AutoDetails, ResidentialDetails, etc.) stay the same — only the property names change.

Apply the same renaming mapping:

- AutoDetails: `marca→brand`, `modelo→model`, `anoFabricacao→manufacturingYear`, `anoModelo→modelYear`, `placa→licensePlate`, `chassi→vin`, `cor→color`, `combustivel→fuelType`, `usoVeiculo→vehicleUsage`
- ResidentialDetails: `tipoImovel→propertyType`, `usoImovel→propertyUsage`, `endereco→address`, `construcao→construction`
- CondominiumDetails: `nomeCondominio→condominiumName`, `numeroUnidades→unitCount`, `endereco→address`, `anoConstrucao→constructionYear`, `numeroAndares→floorCount`
- BusinessDetails: `razaoSocial→legalName`, `atividade→businessActivity`, `endereco→address`
- LifeDetails: `profissao→occupation`, `rendaMensalCentavos→monthlyIncomeCents`, `fumante→isSmoker`, `esportesRadicais→extremeSports`, `alturaEmCentimetros→heightInCentimeters`, `pesoEmGramas→weightInGrams`, `beneficiarios→beneficiaries`
- OtherDetails: `descricao→description`

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/proposals/types/index.ts
git commit -m "refactor: rename frontend proposal type properties to English"
```

---

## Task 4: Update Branch Options Constants

**Files:**

- Modify: `apps/web/src/features/proposals/lib/branch-options.ts`

- [ ] **Step 1: Rename constant names to English**

```typescript
export const FUEL_TYPE_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'Flex', label: 'Flex' },
  { value: 'Gasolina', label: 'Gasolina' },
  { value: 'Etanol', label: 'Etanol' },
  { value: 'Diesel', label: 'Diesel' },
] as const

export const VEHICLE_USAGE_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'Particular', label: 'Particular' },
  { value: 'Comercial', label: 'Comercial' },
  { value: 'Taxi', label: 'Taxi' },
] as const

export const PROPERTY_TYPE_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'Casa', label: 'Casa' },
  { value: 'Apartamento', label: 'Apartamento' },
] as const

export const PROPERTY_USAGE_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'Habitual', label: 'Habitual' },
  { value: 'Veraneio', label: 'Veraneio' },
  { value: 'Desocupado', label: 'Desocupado' },
] as const

export const CONSTRUCTION_OPTIONS = [
  { value: '', label: 'Selecione' },
  { value: 'Alvenaria', label: 'Alvenaria' },
  { value: 'Madeira', label: 'Madeira' },
  { value: 'Mista', label: 'Mista' },
] as const
```

Note: The `value` and `label` strings stay in Portuguese — they are display values stored in the database. Only the constant names change.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/proposals/lib/branch-options.ts
git commit -m "refactor: rename branch option constants to English"
```

---

## Task 5: Update Form Field Components (Auto, Life, Other)

**Files:**

- Modify: `apps/web/src/features/proposals/components/branch-field-sets.tsx`

- [ ] **Step 1: Update imports to use new constant names**

Replace:

```typescript
import { COMBUSTIVEL_OPTIONS, USO_VEICULO_OPTIONS } from '../lib/branch-options'
```

With:

```typescript
import { FUEL_TYPE_OPTIONS, VEHICLE_USAGE_OPTIONS } from '../lib/branch-options'
```

- [ ] **Step 2: Update AutoFields form field registrations**

Change all `register('marca')` → `register('brand')`, `register('modelo')` → `register('model')`, etc. Update Controller names: `name="combustivel"` → `name="fuelType"`, `name="usoVeiculo"` → `name="vehicleUsage"`. Replace `COMBUSTIVEL_OPTIONS` → `FUEL_TYPE_OPTIONS`, `USO_VEICULO_OPTIONS` → `VEHICLE_USAGE_OPTIONS`.

UI labels stay in Portuguese (e.g., `label="Marca"` stays as-is).

- [ ] **Step 3: Rename internal constants to English**

```typescript
const HEIGHT_MIN_CM = 100
const HEIGHT_MAX_CM = 250
const WEIGHT_MIN_KG = 20
const WEIGHT_MAX_KG = 300
const BMI_RANGES = [
  {
    max: BMI_UNDERWEIGHT_THRESHOLD,
    label: 'Abaixo do peso',
    color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
  },
  // ... (keep same structure, labels stay in Portuguese)
] as const
```

Replace `ALTURA_MIN_CM` → `HEIGHT_MIN_CM`, `ALTURA_MAX_CM` → `HEIGHT_MAX_CM`, `PESO_MIN_KG` → `WEIGHT_MIN_KG`, `PESO_MAX_KG` → `WEIGHT_MAX_KG`, `IMC_RANGES` → `BMI_RANGES`.

- [ ] **Step 4: Update ImcBadge → BmiBadge component**

Rename `ImcBadge` → `BmiBadge`. Update `useWatch` names:

```typescript
const altura = useWatch({ control, name: 'heightInCentimeters' })
const peso = useWatch({ control, name: 'weightKg' })
```

Rename local variables: `alturaNum` → `heightCm`, `alturaM` → `heightM`, `imc` → `bmi`.

- [ ] **Step 5: Update LifeFields form registrations**

Change: `register('profissao')` → `register('occupation')`, `register('rendaMensalCentavos')` → `register('monthlyIncomeCents')`, `name="fumante"` → `name="isSmoker"`, `name="esportesRadicais"` → `name="extremeSports"`, `register('alturaEmCentimetros')` → `register('heightInCentimeters')`, `register('pesoKg')` → `register('weightKg')`, `register('beneficiarios')` → `register('beneficiaries')`.

UI labels stay in Portuguese.

- [ ] **Step 6: Update OtherFields form registration**

Change: `register('descricao')` → `register('description')`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/proposals/components/branch-field-sets.tsx
git commit -m "refactor: rename form field registrations to English (auto, life, other)"
```

---

## Task 6: Update Form Field Components (Property Types)

**Files:**

- Modify: `apps/web/src/features/proposals/components/branch-field-sets-property.tsx`

- [ ] **Step 1: Update imports**

Replace:

```typescript
import {
  CONSTRUCAO_OPTIONS,
  TIPO_IMOVEL_OPTIONS,
  USO_IMOVEL_OPTIONS,
} from '../lib/branch-options'
```

With:

```typescript
import {
  CONSTRUCTION_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  PROPERTY_USAGE_OPTIONS,
} from '../lib/branch-options'
```

- [ ] **Step 2: Update ResidentialFields form registrations**

Change: `name="tipoImovel"` → `name="propertyType"`, `name="usoImovel"` → `name="propertyUsage"`, `name="cep"` stays, `register('endereco')` → `register('address')`, `name="construcao"` → `name="construction"`, `register('areaM2')` stays.

Replace option references: `TIPO_IMOVEL_OPTIONS` → `PROPERTY_TYPE_OPTIONS`, `USO_IMOVEL_OPTIONS` → `PROPERTY_USAGE_OPTIONS`, `CONSTRUCAO_OPTIONS` → `CONSTRUCTION_OPTIONS`.

UI labels stay in Portuguese.

- [ ] **Step 3: Update CondominiumFields form registrations**

Change: `register('nomeCondominio')` → `register('condominiumName')`, `register('numeroUnidades')` → `register('unitCount')`, `register('endereco')` → `register('address')`, `register('anoConstrucao')` → `register('constructionYear')`, `register('numeroAndares')` → `register('floorCount')`.

- [ ] **Step 4: Update BusinessFields form registrations**

Change: `register('razaoSocial')` → `register('legalName')`, `register('atividade')` → `register('businessActivity')`, `register('endereco')` → `register('address')`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/proposals/components/branch-field-sets-property.tsx
git commit -m "refactor: rename property form field registrations to English"
```

---

## Task 7: Update buildDetails Mapping Function

**Files:**

- Modify: `apps/web/src/features/proposals/components/branch-fields.tsx`

- [ ] **Step 1: Update all property mappings in buildDetails()**

Each case in the switch must map form field names (now English) to domain properties (now English). Example for AUTO case:

```typescript
case 'AUTO':
  return {
    branch,
    brand: String(fields.brand ?? ''),
    model: String(fields.model ?? ''),
    manufacturingYear: Number(fields.manufacturingYear) || 0,
    modelYear: Number(fields.modelYear) || 0,
    licensePlate: fields.licensePlate ? String(fields.licensePlate) : undefined,
    vin: fields.vin ? String(fields.vin) : undefined,
    color: fields.color ? String(fields.color) : undefined,
    fuelType: fields.fuelType ? String(fields.fuelType) : undefined,
    vehicleUsage: fields.vehicleUsage ? String(fields.vehicleUsage) : undefined,
  }
```

Apply the same mapping for all other cases (RESIDENTIAL, CONDOMINIUM, BUSINESS, LIFE, OTHER) using the English property names.

For LIFE case, update `pesoEmGramas` → `weightInGrams` and `fields.pesoKg` → `fields.weightKg`:

```typescript
case 'LIFE':
  return {
    branch,
    occupation: String(fields.occupation ?? ''),
    monthlyIncomeCents: fields.monthlyIncomeCents
      ? Number(fields.monthlyIncomeCents)
      : undefined,
    isSmoker: fields.isSmoker === true ? true : undefined,
    extremeSports: fields.extremeSports === true ? true : undefined,
    heightInCentimeters: fields.heightInCentimeters
      ? Number(fields.heightInCentimeters)
      : undefined,
    weightInGrams: fields.weightKg
      ? Math.round(Number(fields.weightKg) * 1000)
      : undefined,
    beneficiaries: fields.beneficiaries
      ? String(fields.beneficiaries)
      : undefined,
  }
```

- [ ] **Step 2: Update defaultValues mapping for weight conversion**

Replace:

```typescript
if (
  'branch' in defaults &&
  defaults.branch === 'LIFE' &&
  'pesoEmGramas' in defaults &&
  typeof defaults.pesoEmGramas === 'number' &&
  defaults.pesoEmGramas > 0
) {
  formDefaults.pesoKg = defaults.pesoEmGramas / 1000
}
```

With:

```typescript
if (
  'branch' in defaults &&
  defaults.branch === 'LIFE' &&
  'weightInGrams' in defaults &&
  typeof defaults.weightInGrams === 'number' &&
  defaults.weightInGrams > 0
) {
  formDefaults.weightKg = defaults.weightInGrams / 1000
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/components/branch-fields.tsx
git commit -m "refactor: rename buildDetails mapping to English properties"
```

---

## Task 8: Update PDF Template

**Files:**

- Modify: `apps/server/src/pdf-templates/insured-object-section.tsx`

- [ ] **Step 1: Update all property accesses in render functions**

In `AutoSection`: `details.marca` → `details.brand`, `details.modelo` → `details.model`, `details.anoFabricacao` → `details.manufacturingYear`, `details.anoModelo` → `details.modelYear`, `details.placa` → `details.licensePlate`, `details.cor` → `details.color`, `details.combustivel` → `details.fuelType`, `details.usoVeiculo` → `details.vehicleUsage`.

In `ResidentialSection`: `details.tipoImovel` → `details.propertyType`, `details.usoImovel` → `details.propertyUsage`, `details.endereco` → `details.address`, `details.construcao` → `details.construction`.

In `CondominiumSection`: `details.nomeCondominio` → `details.condominiumName`, `details.numeroUnidades` → `details.unitCount`, `details.endereco` → `details.address`, `details.numeroAndares` → `details.floorCount`, `details.anoConstrucao` → `details.constructionYear`.

In `BusinessSection`: `details.razaoSocial` → `details.legalName`, `details.atividade` → `details.businessActivity`, `details.endereco` → `details.address`.

In `LifeSection`: `details.profissao` → `details.occupation`, `details.rendaMensalCentavos` → `details.monthlyIncomeCents`, `details.fumante` → `details.isSmoker`, `details.esportesRadicais` → `details.extremeSports`, `details.alturaEmCentimetros` → `details.heightInCentimeters`, `details.pesoEmGramas` → `details.weightInGrams`, `details.beneficiarios` → `details.beneficiaries`.

In `OtherSection`: `details.descricao` → `details.description`.

UI labels (the strings passed to `FieldRow label=`) stay in Portuguese.

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/pdf-templates/insured-object-section.tsx
git commit -m "refactor: rename PDF template property accesses to English"
```

---

## Task 9: Update Tests

**Files:**

- Modify: `packages/core/src/modules/proposal/domain/proposal.spec.ts`
- Modify: `packages/core/src/modules/proposal/application/update-proposal-details.spec.ts`

- [ ] **Step 1: Update proposal.spec.ts**

No changes needed — the test uses `AutoDetails` type but doesn't reference individual Portuguese properties directly. Verify by checking the file.

- [ ] **Step 2: Update update-proposal-details.spec.ts fixture**

Replace:

```typescript
const autoDetails: AutoDetails = {
  branch: 'AUTO',
  marca: 'Toyota',
  modelo: 'Corolla',
  anoFabricacao: 2024,
  anoModelo: 2025,
}
```

With:

```typescript
const autoDetails: AutoDetails = {
  branch: 'AUTO',
  brand: 'Toyota',
  model: 'Corolla',
  manufacturingYear: 2024,
  modelYear: 2025,
}
```

- [ ] **Step 3: Run tests to verify everything passes**

Run: `pnpm --filter @repo/core test`

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/modules/proposal/domain/proposal.spec.ts packages/core/src/modules/proposal/application/update-proposal-details.spec.ts
git commit -m "refactor: update test fixtures to English property names"
```

---

## Task 10: Run Typecheck to Catch Any Remaining References

- [ ] **Step 1: Run full typecheck**

Run: `pnpm typecheck`

If there are errors, they will point to remaining files that reference old Portuguese property names. Fix each one by applying the same renaming mapping.

- [ ] **Step 2: Run full build**

Run: `pnpm build`

Expected: Build succeeds.

- [ ] **Step 3: Commit any remaining fixes**

```bash
git add -A
git commit -m "refactor: fix remaining Portuguese property references"
```

---

## Task 11: Fix Marketing Page Portuguese Errors

**Files:**

- Modify: `apps/web/src/features/marketing/components/marketing-nav.tsx`
- Modify: `apps/web/src/features/marketing/components/marketing-footer.tsx`
- Modify: `apps/web/src/features/marketing/components/hero-content.tsx`
- Modify: `apps/web/src/features/marketing/components/how-it-works-section.tsx`
- Modify: `apps/web/src/features/marketing/components/features-section.tsx`
- Modify: `apps/web/src/features/marketing/components/pricing-section.tsx`
- Modify: `apps/web/src/features/marketing/components/problem-section.tsx`
- Modify: `apps/web/src/features/marketing/components/testimonials-section.tsx`
- Modify: `apps/web/src/features/marketing/components/faq-cta-section.tsx`
- Modify: `apps/web/src/app/(marketing)/layout.tsx`

- [ ] **Step 1: Fix each file**

For each file, read it and fix all Portuguese accent/cedilla errors. Common replacements:

| Wrong               | Correct             |
| ------------------- | ------------------- |
| `Precos`            | `Preços`            |
| `Comecar Gratis`    | `Começar Grátis`    |
| `Pagina inicial`    | `Página inicial`    |
| `rodape`            | `rodapé`            |
| `ja usam`           | `já usam`           |
| `cartao de credito` | `cartão de crédito` |
| `apolices`          | `apólices`          |
| `comissoes`         | `comissões`         |
| `inteligencia`      | `inteligência`      |
| `unico/unica`       | `único/única`       |
| `comecar`           | `começar`           |
| `cotacao`           | `cotação`           |
| `emissao`           | `emissão`           |
| `automacoes`        | `automações`        |
| `historico`         | `histórico`         |
| `rastreavel`        | `rastreável`        |
| `automatico`        | `automático`        |
| `nao`               | `não`               |
| `Visao`             | `Visão`             |
| `operacao`          | `operação`          |
| `graficos`          | `gráficos`          |
| `decisoes`          | `decisões`          |
| `rapidas`           | `rápidas`           |
| `Ate`               | `Até`               |
| `avancado`          | `avançado`          |
| `voce`              | `você`              |
| `informacoes`       | `informações`       |
| `Sao Paulo`         | `São Paulo`         |
| `integracao`        | `integração`        |
| `incrivel`          | `incrível`          |
| `atualizacoes`      | `atualizações`      |
| `satisfacao`        | `satisfação`        |
| `usavamos`          | `usávamos`          |
| `esta`              | `está`              |
| `so`                | `só`                |
| `Nao`               | `Não`               |
| `estao`             | `estão`             |
| `certificacao`      | `certificação`      |
| `automaticos`       | `automáticos`       |
| `diarios`           | `diários`           |
| `multiplas`         | `múltiplas`         |
| `seguranca`         | `segurança`         |
| `importacao`        | `importação`        |
| `migracao`          | `migração`          |
| `cartao`            | `cartão`            |
| `conteudo`          | `conteúdo`          |

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/marketing/ apps/web/src/app/\(marketing\)/layout.tsx
git commit -m "fix: correct Portuguese accents in marketing pages"
```

---

## Task 12: Fix Auth & Client Form Portuguese Errors

**Files:**

- Modify: `apps/web/src/features/auth/components/login-form.tsx`
- Modify: `apps/web/src/features/auth/components/register-form.tsx`
- Modify: `apps/web/src/features/clients/lib/schemas.ts`
- Modify: `apps/web/src/features/clients/components/client-form-fields.tsx`
- Modify: `apps/web/src/features/clients/components/client-form.tsx`
- Modify: `apps/web/src/features/clients/components/import-dialog.tsx`
- Modify: `apps/web/src/features/clients/components/import-step-processing.tsx`

- [ ] **Step 1: Fix auth validation messages**

In `login-form.tsx`: `invalido` → `inválido`, `Minimo` → `Mínimo`.
In `register-form.tsx`: `Minimo` → `Mínimo`, `invalido` → `inválido`, `nao conferem` → `não conferem`.

- [ ] **Step 2: Fix client schemas and forms**

In `clients/lib/schemas.ts`: `obrigatorio` → `obrigatório`, `minimo` → `mínimo`, `maximo` → `máximo`, `invalido` → `inválido`, `Profissao` → `Profissão`.
In `client-form-fields.tsx`: `Profissao` → `Profissão`.
In `client-form.tsx`: `informacoes` → `informações`.
In `import-dialog.tsx`: `sao` → `são`, `importacao` → `importação`.
In `import-step-processing.tsx`: `Nao` → `Não`, `importacao` → `importação`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/auth/ apps/web/src/features/clients/
git commit -m "fix: correct Portuguese accents in auth and client forms"
```

---

## Task 13: Fix Channel, Organization, Member, AI Agent Portuguese Errors

**Files:**

- Modify: `apps/web/src/features/channels/lib/schemas.ts`
- Modify: `apps/web/src/features/channels/components/channels-page.tsx`
- Modify: `apps/web/src/features/channels/components/channel-form-sheet.tsx`
- Modify: `apps/web/src/features/channels/components/channel-qr-dialog.tsx`
- Modify: `apps/web/src/features/channels/components/deactivate-channel-dialog.tsx`
- Modify: `apps/web/src/features/organization/components/organization-form.tsx`
- Modify: `apps/web/src/features/organization/components/organization-page.tsx`
- Modify: `apps/web/src/features/organization/hooks/use-upload-logo.ts`
- Modify: `apps/web/src/features/members/lib/member-schemas.ts`
- Modify: `apps/web/src/features/ai-agents/lib/schemas.ts`
- Modify: `apps/web/src/features/ai-agents/components/ai-agent-form-sheet.tsx`

- [ ] **Step 1: Fix channel files**

In `channels/lib/schemas.ts`: `obrigatorio` → `obrigatório`, `conexao` → `conexão`.
In `channels-page.tsx`: `comunicacao` → `comunicação`, `Nao foi possivel` → `Não foi possível`, `comecar` → `começar`.
In `channel-form-sheet.tsx`: `informacoes` → `informações`, `comunicacao` → `comunicação`, `Numero` → `Número`.
In `channel-qr-dialog.tsx`: `conexao` → `conexão`.
In `deactivate-channel-dialog.tsx`: `serao` → `serão`.

- [ ] **Step 2: Fix organization files**

In `organization-form.tsx`: `minimo` → `mínimo`, `maximo` → `máximo`, `minusculas` → `minúsculas`, `organizacao` → `organização`, `unico` → `único`.
In `organization-page.tsx`: `organizacao` → `organização`, `Organizacao` → `Organização`, `informacoes` → `informações`.
In `use-upload-logo.ts`: `maximo` → `máximo`, `invalido` → `inválido`.

- [ ] **Step 3: Fix member and AI agent files**

In `member-schemas.ts`: `invalido` → `inválido`, `Proprietario` → `Proprietário`.
In `ai-agents/lib/schemas.ts`: `obrigatorio` → `obrigatório`, `maximo` → `máximo`, `Descricao` → `Descrição`.
In `ai-agent-form-sheet.tsx`: `configuracoes` → `configurações`, `Descricao` → `Descrição`, `descricao` → `descrição`, `Instrucoes` → `Instruções`, `Voce` → `Você`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/channels/ apps/web/src/features/organization/ apps/web/src/features/members/ apps/web/src/features/ai-agents/
git commit -m "fix: correct Portuguese accents in channels, org, members, AI agents"
```

---

## Task 14: Fix Chat, Dashboard, Audit, Commission Portuguese Errors

**Files:**

- Modify: `apps/web/src/features/chat/components/header-actions.tsx`
- Modify: `apps/web/src/features/chat/components/transfer-agent-modal.tsx`
- Modify: `apps/web/src/features/chat/components/chat-area-states.tsx`
- Modify: `apps/web/src/features/dashboard/components/conversion-rate.tsx`
- Modify: `apps/web/src/features/audit/components/audit-table.tsx`
- Modify: `apps/web/src/features/commissions/components/commissions-table-rows.tsx`

- [ ] **Step 1: Fix chat files**

In `header-actions.tsx`: `sera` → `será`, `podera` → `poderá`.
In `transfer-agent-modal.tsx`: `disponivel` → `disponível`, `Nao` → `Não`, `transferencia` → `transferência`, `Transferencia` → `Transferência`.
In `chat-area-states.tsx`: `comecar` → `começar`.

- [ ] **Step 2: Fix dashboard, audit, commission files**

In `conversion-rate.tsx`: `conversao` → `conversão`.
In `audit-table.tsx`: `Acao` → `Ação`.
In `commissions-table-rows.tsx`: `apolices` → `apólices`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/chat/ apps/web/src/features/dashboard/ apps/web/src/features/audit/ apps/web/src/features/commissions/
git commit -m "fix: correct Portuguese accents in chat, dashboard, audit, commissions"
```

---

## Task 15: Final Validation

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`

Expected: Zero errors.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: Zero errors.

- [ ] **Step 3: Run build**

Run: `pnpm build`

Expected: Successful build.

- [ ] **Step 4: Run tests**

Run: `pnpm test`

Expected: All tests pass.

- [ ] **Step 5: Grep for remaining Portuguese property names in code**

Run: `grep -r "marca\|modelo\|anoFabricacao\|anoModelo\|placa\|chassi\|combustivel\|usoVeiculo\|tipoImovel\|usoImovel\|endereco\|construcao\|nomeCondominio\|numeroUnidades\|anoConstrucao\|numeroAndares\|razaoSocial\|atividade\|profissao\|rendaMensalCentavos\|fumante\|esportesRadicais\|alturaEmCentimetros\|pesoEmGramas\|beneficiarios\|descricao" --include="*.ts" --include="*.tsx" apps/ packages/`

Expected: No matches in code files (documentation files are ok).

- [ ] **Step 6: Grep for common Portuguese accent errors in UI strings**

Run: `grep -rn "obrigatorio\|organizacao\|informacoes\|Comecar\|comecar\|Precos\|invalido\|minimo\|maximo\|Descricao\|descricao\|conexao\|comunicacao\|Numero\|configuracoes\|Instrucoes\|transferencia\|disponivel\|conversao\|Acao\b" --include="*.tsx" --include="*.ts" apps/web/src/`

Expected: No matches.

- [ ] **Step 7: Commit any remaining fixes and push**

```bash
git push -u origin refactor/i18n-portuguese-fixes
```
