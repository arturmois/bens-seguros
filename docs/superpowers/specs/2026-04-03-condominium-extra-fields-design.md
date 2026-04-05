# Condominium Extra Fields Design Spec

**Jira:** SCRUM-24 | **Date:** 2026-04-03

## Goal

Extend the condominium insured-object form with structural and safety fields so brokers can capture richer risk data for insurers.

## Current State

The `CONDOMINIUM` branch captures 6 fields:

- `condominiumName` (required), `unitCount` (required), `cep` (required)
- `address`, `constructionYear`, `floorCount` (optional)

These live in a `Json` column (`insuredObjectDetails`) on the `Proposal` model — no Prisma migration needed.

## New Fields

| Field                      | Type           | Required | UI Label                           |
| -------------------------- | -------------- | -------- | ---------------------------------- |
| `blockCount`               | `number (int)` | No       | Quantidade de Blocos               |
| `elevatorCount`            | `number (int)` | No       | Quantidade de Elevadores           |
| `employeeCount`            | `number (int)` | No       | Número de Funcionários             |
| `hasSecurityEquipment`     | `boolean`      | No       | Possui equipamentos de segurança?  |
| `securityEquipmentDetails` | `string`       | No       | Quais? (shown when toggle is true) |
| `hasFireEquipment`         | `boolean`      | No       | Possui equipamentos de incêndio?   |
| `fireEquipmentDetails`     | `string`       | No       | Quais? (shown when toggle is true) |

## Layers to Change

### 1. Backend — `apps/server/src/routes/v1/proposals/_schemas.ts`

Extend `condominiumDetailsSchema`:

```typescript
const condominiumDetailsSchema = z.object({
  branch: z.literal('CONDOMINIUM'),
  condominiumName: z.string().min(1),
  unitCount: z.number().int().min(1),
  cep: z.string().min(1),
  address: z.string().optional(),
  constructionYear: z.number().int().optional(),
  floorCount: z.number().int().optional(),
  // New fields
  blockCount: z.number().int().optional(),
  elevatorCount: z.number().int().optional(),
  employeeCount: z.number().int().optional(),
  hasSecurityEquipment: z.boolean().optional(),
  securityEquipmentDetails: z.string().optional(),
  hasFireEquipment: z.boolean().optional(),
  fireEquipmentDetails: z.string().optional(),
})
```

No other backend changes — the JSON is stored as-is in Prisma.

### 2. Frontend Interface — `apps/web/src/features/proposals/lib/constants.ts`

Extend `CondominiumDetails`:

```typescript
export interface CondominiumDetails {
  branch: 'CONDOMINIUM'
  condominiumName: string
  unitCount: number
  cep: string
  address?: string
  constructionYear?: number
  floorCount?: number
  blockCount?: number
  elevatorCount?: number
  employeeCount?: number
  hasSecurityEquipment?: boolean
  securityEquipmentDetails?: string
  hasFireEquipment?: boolean
  fireEquipmentDetails?: string
}
```

### 3. Frontend Form — `apps/web/src/features/proposals/components/branch-field-sets-property.tsx`

Add new fields to `CondominiumFields` component, organized in two visual groups:

**Existing group** (unchanged): Nome, Unidades, CEP, Endereço, Ano Construção, Andares

**New group** ("Características do Condomínio"):

- Row: Blocos | Elevadores
- Row: Funcionários | _(empty)_
- Full-width: Checkbox "Possui equipamentos de segurança?" → conditional text input
- Full-width: Checkbox "Possui equipamentos de incêndio?" → conditional text input

The conditional text inputs use `watch('hasSecurityEquipment')` / `watch('hasFireEquipment')` from react-hook-form to show/hide.

### 4. Frontend Builder — `apps/web/src/features/proposals/components/branch-fields.tsx`

Extend the `CONDOMINIUM` case in `buildDetails()`:

```typescript
case 'CONDOMINIUM':
  return {
    branch,
    condominiumName: String(fields.condominiumName ?? ''),
    unitCount: Number(fields.unitCount) || 0,
    cep: String(fields.cep ?? ''),
    address: fields.address ? String(fields.address) : undefined,
    constructionYear: fields.constructionYear ? Number(fields.constructionYear) : undefined,
    floorCount: fields.floorCount ? Number(fields.floorCount) : undefined,
    blockCount: fields.blockCount ? Number(fields.blockCount) : undefined,
    elevatorCount: fields.elevatorCount ? Number(fields.elevatorCount) : undefined,
    employeeCount: fields.employeeCount ? Number(fields.employeeCount) : undefined,
    hasSecurityEquipment: fields.hasSecurityEquipment === true ? true : undefined,
    securityEquipmentDetails: fields.securityEquipmentDetails ? String(fields.securityEquipmentDetails) : undefined,
    hasFireEquipment: fields.hasFireEquipment === true ? true : undefined,
    fireEquipmentDetails: fields.fireEquipmentDetails ? String(fields.fireEquipmentDetails) : undefined,
  }
```

### 5. Orval Regeneration

After backend schema changes, run `pnpm --filter @app/web generate:api` to regenerate types.

## What NOT to Do

- No Prisma migration — `insuredObjectDetails` is already `Json`
- No new components — inline in existing `CondominiumFields`
- No numeric range validation — the broker knows the data
- No PDF changes — deferred to SCRUM-48

## Backwards Compatibility

Existing proposals with `CONDOMINIUM` branch will load normally — all new fields are optional with `undefined` defaults. The form renders them empty, and the builder ignores `undefined` values.
