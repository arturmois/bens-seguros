# Aggilizador Client Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `packages/aggilizador` — a TypeScript client wrapping the undocumented Aggilizador REST API for submitting insurance quotes, starting with the Auto branch.

**Architecture:** Stateless HTTP client using native `fetch`. Enum mappings are fetched dynamically from the API with hardcoded fallbacks. Payload builders isolate API shape knowledge from consumer-facing types. No auth required — uses `BrokerId` + `InsuranceBroker` per call.

**Tech Stack:** TypeScript 5.9 strict, Zod validation, Node 22 native fetch, Vitest

**Spec:** `docs/superpowers/specs/2026-04-16-aggilizador-client-package-design.md`

---

## File Map

| File                                                             | Responsibility                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/aggilizador/package.json`                              | Package manifest, deps, scripts                              |
| `packages/aggilizador/tsconfig.json`                             | TS config extending monorepo base                            |
| `packages/aggilizador/src/index.ts`                              | Public exports barrel                                        |
| `packages/aggilizador/src/errors.ts`                             | Error class hierarchy                                        |
| `packages/aggilizador/src/http.ts`                               | Fetch wrapper with error handling                            |
| `packages/aggilizador/src/client.ts`                             | AggilizadorClient main class                                 |
| `packages/aggilizador/src/types/enums.ts`                        | Typed string union enums                                     |
| `packages/aggilizador/src/types/common.ts`                       | Shared input types (InsuredPersonInput, PhoneInput)          |
| `packages/aggilizador/src/types/auto.ts`                         | Auto-specific types (VehicleInput, QuestionnaireInput, etc.) |
| `packages/aggilizador/src/types/api.ts`                          | Raw API request/response shapes                              |
| `packages/aggilizador/src/mappings/auto-enum-defaults.ts`        | Hardcoded enum key mappings (single source)                  |
| `packages/aggilizador/src/mappings/enum-registry.ts`             | Dynamic enum fetcher + in-memory cache                       |
| `packages/aggilizador/src/builders/auto-payload-builder.ts`      | Transforms typed inputs → API JSON                           |
| `packages/aggilizador/src/branches/auto.ts`                      | AutoQuoteService (submitQuote, getEnums)                     |
| `packages/aggilizador/src/fipe/fipe-client.ts`                   | FIPE model search client                                     |
| `packages/aggilizador/src/schemas.ts`                            | Zod validation schemas for inputs                            |
| **Tests**                                                        |                                                              |
| `packages/aggilizador/src/builders/auto-payload-builder.spec.ts` | Payload builder tests                                        |
| `packages/aggilizador/src/mappings/enum-registry.spec.ts`        | Enum registry tests                                          |
| `packages/aggilizador/src/branches/auto.spec.ts`                 | AutoQuoteService tests                                       |
| `packages/aggilizador/src/fipe/fipe-client.spec.ts`              | FIPE client tests                                            |

---

### Task 1: Package scaffold

**Files:**

- Create: `packages/aggilizador/package.json`
- Create: `packages/aggilizador/tsconfig.json`
- Create: `packages/aggilizador/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@repo/aggilizador",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest watch"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "@types/node": "^22.0.0",
    "typescript": "^5.9.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@config/typescript-config/node.json",
  "include": ["src"]
}
```

- [ ] **Step 3: Create stub index.ts**

```ts
// @repo/aggilizador — Aggilizador insurance quote API client
// Exports will be added as modules are implemented
```

- [ ] **Step 4: Install dependencies**

Run: `pnpm install`
Expected: Successful install, lockfile updated

- [ ] **Step 5: Verify typecheck**

Run: `pnpm --filter @repo/aggilizador exec tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add packages/aggilizador/
git commit -m "feat(aggilizador): scaffold package with deps and tsconfig"
```

---

### Task 2: Error types

**Files:**

- Create: `packages/aggilizador/src/errors.ts`

- [ ] **Step 1: Create error class hierarchy**

```ts
export class AggilizadorError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AggilizadorError'
    this.code = code
  }
}

export class AggilizadorApiError extends AggilizadorError {
  readonly statusCode: number
  readonly responseBody: unknown

  constructor(statusCode: number, responseBody: unknown) {
    const message = `Aggilizador API returned ${statusCode}`
    super('API_ERROR', message)
    this.name = 'AggilizadorApiError'
    this.statusCode = statusCode
    this.responseBody = responseBody
  }
}

export class AggilizadorValidationError extends AggilizadorError {
  readonly fieldErrors: Record<string, string[]>

  constructor(fieldErrors: Record<string, string[]>) {
    const fields = Object.keys(fieldErrors).join(', ')
    super('VALIDATION_ERROR', `Invalid input fields: ${fields}`)
    this.name = 'AggilizadorValidationError'
    this.fieldErrors = fieldErrors
  }
}

export class AggilizadorBusinessError extends AggilizadorError {
  readonly errorMessages: string[]

  constructor(errorMessages: string[]) {
    super('BUSINESS_ERROR', `Aggilizador rejected: ${errorMessages.join('; ')}`)
    this.name = 'AggilizadorBusinessError'
    this.errorMessages = errorMessages
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @repo/aggilizador exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/aggilizador/src/errors.ts
git commit -m "feat(aggilizador): add error class hierarchy"
```

---

### Task 3: Enum types

**Files:**

- Create: `packages/aggilizador/src/types/enums.ts`

- [ ] **Step 1: Create all typed string union enums**

```ts
export type Gender = 'MALE' | 'FEMALE'

export type MaritalStatus =
  | 'MARRIED'
  | 'DIVORCED'
  | 'SEPARATED'
  | 'SINGLE'
  | 'WIDOWED'

export type FuelType =
  | 'FLEX'
  | 'GASOLINE'
  | 'ALCOHOL'
  | 'DIESEL'
  | 'HYBRID'
  | 'TETRAFUEL'
  | 'ELECTRIC'

export type ResidenceType = 'HOUSE' | 'APARTMENT' | 'CONDOMINIUM' | 'OTHER'

export type ResidenceGarageType =
  | 'ELECTRONIC_GATE'
  | 'MANUAL_GATE'
  | 'NO_GARAGE'

export type WorkGarageType = 'NOT_APPLICABLE' | 'NO' | 'YES' | 'NOT_WORKING'

export type StudyGarageType = 'NOT_APPLICABLE' | 'NO' | 'YES' | 'NOT_STUDENT'

export type VehicleUsage = 'PERSONAL' | 'PROFESSIONAL' | 'TAXI' | 'APP_DRIVER'

export type InsuranceType = 'NEW' | 'RENEWAL'

export type DriverRelationship =
  | 'SELF'
  | 'SPOUSE'
  | 'EMPLOYEE'
  | 'SIBLING'
  | 'CHILD'
  | 'MOTHER'
  | 'FATHER'
  | 'OTHER'

export type TrackerType =
  | 'NONE'
  | 'AUTOTRAC'
  | 'CAR_SYSTEM'
  | 'CELTEC'
  | 'CIELO'
  | 'GRABER'
  | 'ITURAN'
  | 'TRACKER'
  | 'OMNILINK'
  | 'POSITRON'
  | 'SASCAR'
  | 'DAF_V'
  | 'CEABS'
  | 'ONSTAR'
  | 'LO_JACK'
  | 'FACTORY_ORIGINAL'
  | 'SEGSAT'
  | 'SAT_COMPANY'

export type AntitheftType =
  | 'NONE'
  | 'ALARM'
  | 'IGNITION_BLOCKER'
  | 'CARNEIRO_LOCK'
  | 'MULT_LOCK'
  | 'OTHER'

export type BooleanOption = 'YES' | 'NO'

export interface EnumOption {
  key: string
  value: string
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @repo/aggilizador exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/aggilizador/src/types/enums.ts
git commit -m "feat(aggilizador): add typed enum unions for all API options"
```

---

### Task 4: Common and Auto input types

**Files:**

- Create: `packages/aggilizador/src/types/common.ts`
- Create: `packages/aggilizador/src/types/auto.ts`

- [ ] **Step 1: Create common types**

```ts
import type { Gender, MaritalStatus } from './enums.js'

export interface PhoneInput {
  areaCode: string
  number: string
}

export interface InsuredPersonInput {
  cpf: string
  fullName: string
  birthDate: string
  gender: Gender
  maritalStatus: MaritalStatus
  cep: string
  email: string
  cellPhone: PhoneInput | null
  homePhone: PhoneInput | null
}

export interface ClientConfig {
  baseUrl?: string
  fipeBaseUrl?: string
}

export interface QuoteResult {
  id: string
}
```

- [ ] **Step 2: Create auto-specific types**

```ts
import type {
  AntitheftType,
  DriverRelationship,
  FuelType,
  Gender,
  InsuranceType,
  MaritalStatus,
  ResidenceGarageType,
  ResidenceType,
  StudyGarageType,
  TrackerType,
  VehicleUsage,
  WorkGarageType,
} from './enums.js'
import type { InsuredPersonInput } from './common.js'

export interface VehicleInput {
  licensePlate?: string
  model: string
  manufacturer: string
  manufactureYear: number
  modelYear: number
  fipeCode: string
  isZeroKm: boolean
  fuelType: FuelType
  overnightCep: string
  tracker: TrackerType
  antitheft: AntitheftType
  isFinanced: boolean
  hasGasKit: boolean
  isArmored: boolean
  chassisNumber?: string
}

export interface QuestionnaireInput {
  residenceType: ResidenceType
  residenceGarage: ResidenceGarageType
  workGarage: WorkGarageType
  studyGarage: StudyGarageType
  vehicleUsage: VehicleUsage
  monthlyMileage: number
  isPcd: boolean
  livesWithUnder26: boolean
  profession?: string
  workDistance?: string
  usagePeriod?: string
}

export interface InsuranceInput {
  type: InsuranceType
  startDate: string
  endDate: string
  commission: number
  bonus?: string
  previousInsurer?: string
  previousPolicyNumber?: string
  hasClaims?: boolean
  observations?: string
}

export interface MainDriverInput {
  cpf: string
  fullName: string
  birthDate: string
  gender: Gender
  maritalStatus: MaritalStatus
  licenseYears?: number
  relationship: DriverRelationship
}

export interface AutoQuoteInput {
  brokerId: number
  insuranceBroker: string
  insured: InsuredPersonInput
  vehicle: VehicleInput
  questionnaire: QuestionnaireInput
  insurance: InsuranceInput
  mainDriver: MainDriverInput
}

export interface FipeModel {
  model: string
  manufacturer: string
  fipeCode: string
  vehicleType: number
}

export interface FipeSearchInput {
  model: string
  year: number
}
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @repo/aggilizador exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/aggilizador/src/types/
git commit -m "feat(aggilizador): add common and auto input/result types"
```

---

### Task 5: API types (raw shapes)

**Files:**

- Create: `packages/aggilizador/src/types/api.ts`

These are the exact JSON shapes the Aggilizador API expects/returns. They are internal — never exposed to consumers.

- [ ] **Step 1: Create raw API types**

```ts
export interface ApiPhone {
  Ddd: string | null
  Numero: string | null
}

export interface ApiInsured {
  CpfCnpj: string
  NomeCompleto: string
  DataNascimento: string
  Sexo: string
  EstadoCivil: string
  TempoHabilitacao: string
  NumeroHabilitacao: string
  Cep: string
  Email: string
  TelefoneResidencial: ApiPhone
  TelefoneCelular: ApiPhone
  RelacaoSeguradoCondutor: string
  Perfil?: boolean
}

export interface ApiDriver {
  CpfCnpj: string
  NomeCompleto: string
  DataNascimento: string
  Sexo: string
  EstadoCivil: string
  TempoHabilitacao: string
  NumeroHabilitacao: string
}

export interface ApiFipeInfo {
  Modelo: string
  Marca: string
  Codigo: string
  TipoVeiculo: number
}

export interface ApiVehicle {
  NumeroChassi: string
  Placa: string
  Modelo: string
  Fabricante: string
  AnoFabricacao: string
  AnoModelo: string
  CodigoFipe: string
  ZeroKm: string
  Rastreador: string
  Antifurto: string
  Alienado: string
  Combustivel: string
  CepPernoite: string
  KitGas: string
  Blindado: string
  Fipe: ApiFipeInfo
}

export interface ApiQuestionnaire {
  TipoResidencia: string
  VeiculosResidencia: string
  QuilometragemMensal: string
  GaragemTrabalho: string
  GaragemResidencia: string
  GaragemEstudo: string
  UsoVeiculo: string
  UsoDependentes: string
  FaixaEtariaDependentes: string
  DistanciaResidenciaTrabalho: string
  Profissao: string | null
  Associado: string
  PeriodoUso: string
  Pcd: string
  IsencaoFiscal: string | null
}

export interface ApiInsurance {
  Banco: string
  Bonus: string
  TipoSeguro: string
  VigenciaInicial: string
  VigenciaFinal: string
  VigenciaFinalAnterior: string | null
  SeguradoraAnterior: string
  CodigoIdentificacao: string
  NumeroApoliceAnterior: string
  Sinistros: string
  Comissao: string
  Agenciamento: string
  Observacoes: string
  RenovacaoGarantida: boolean
  ComissaoSeguradora: string | null
}

export interface ApiContactPayload {
  CalculationType: number
  Id: string | null
  BrokerId: number
  InsuranceBroker: string
  Data: ApiInsured
}

export interface ApiContactResponse {
  Id: string
  ErrorMessages: string[]
}

export interface ApiAutoSubmitPayload {
  Id: string
  OnlineId: null
  BrokerId: number
  DeviceId: null
  InsuranceBroker: string
  CalculationAuto: {
    Segurado: ApiInsured
    CondutorPrincipal: ApiDriver
    Veiculo: ApiVehicle
    Questionario: ApiQuestionnaire
    Caminhao: null
    Cobertura: null
    Seguro: ApiInsurance
  }
  CalculationResidence: null
  CalculationCondominium: null
  CalculationSeveral: null
  CalculationLife: null
  CalculationLifeGlobal: null
  CalculationBusiness: null
  CalculationTravel: null
  CalculationBike: null
  CalculationRent: null
  Renovation: boolean
  Type: number
}

export interface ApiEnumOption {
  Key: string
  Value: string
}

export type ApiAutoDataResponse = Record<string, ApiEnumOption[]>
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @repo/aggilizador exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/aggilizador/src/types/api.ts
git commit -m "feat(aggilizador): add raw API request/response shapes"
```

---

### Task 6: Hardcoded enum defaults

**Files:**

- Create: `packages/aggilizador/src/mappings/auto-enum-defaults.ts`

This is the single file to edit if Lojacorr changes enum keys. Each map goes from our English key → API string key.

- [ ] **Step 1: Create all enum mapping defaults**

```ts
export const GENDER_MAP = {
  MALE: '1',
  FEMALE: '2',
} as const

export const MARITAL_STATUS_MAP = {
  MARRIED: '1',
  DIVORCED: '2',
  SEPARATED: '3',
  SINGLE: '4',
  WIDOWED: '5',
} as const

export const FUEL_TYPE_MAP = {
  FLEX: '1',
  GASOLINE: '2',
  ALCOHOL: '3',
  DIESEL: '4',
  HYBRID: '5',
  TETRAFUEL: '6',
  ELECTRIC: '7',
} as const

export const RESIDENCE_TYPE_MAP = {
  HOUSE: '1',
  APARTMENT: '2',
  CONDOMINIUM: '3',
  OTHER: '4',
} as const

export const RESIDENCE_GARAGE_MAP = {
  ELECTRONIC_GATE: '1',
  MANUAL_GATE: '2',
  NO_GARAGE: '3',
} as const

export const WORK_GARAGE_MAP = {
  NOT_APPLICABLE: '0',
  NO: '1',
  YES: '2',
  NOT_WORKING: '3',
} as const

export const STUDY_GARAGE_MAP = {
  NOT_APPLICABLE: '0',
  NO: '1',
  YES: '2',
  NOT_STUDENT: '3',
} as const

export const VEHICLE_USAGE_MAP = {
  PERSONAL: '0',
  PROFESSIONAL: '1',
  TAXI: '2',
  APP_DRIVER: '3',
} as const

export const INSURANCE_TYPE_MAP = {
  NEW: '0',
  RENEWAL: '1',
} as const

export const DRIVER_RELATIONSHIP_MAP = {
  SELF: '0',
  SPOUSE: '2',
  EMPLOYEE: '3',
  SIBLING: '4',
  CHILD: '5',
  MOTHER: '6',
  FATHER: '7',
  OTHER: '8',
} as const

export const TRACKER_MAP = {
  NONE: '0',
  AUTOTRAC: '1',
  CAR_SYSTEM: '2',
  CELTEC: '3',
  CIELO: '4',
  GRABER: '5',
  ITURAN: '6',
  TRACKER: '7',
  OMNILINK: '8',
  POSITRON: '9',
  SASCAR: '10',
  DAF_V: '11',
  CEABS: '12',
  ONSTAR: '13',
  LO_JACK: '14',
  FACTORY_ORIGINAL: '15',
  SEGSAT: '16',
  SAT_COMPANY: '17',
} as const

export const ANTITHEFT_MAP = {
  NONE: '0',
  ALARM: '1',
  IGNITION_BLOCKER: '2',
  CARNEIRO_LOCK: '3',
  MULT_LOCK: '4',
  OTHER: '5',
} as const

export const BOOLEAN_MAP = {
  NO: '0',
  YES: '1',
} as const

export const ALL_ENUM_DEFAULTS = {
  Sexo: GENDER_MAP,
  EstadoCivil: MARITAL_STATUS_MAP,
  Combustivel: FUEL_TYPE_MAP,
  TipoResidencia: RESIDENCE_TYPE_MAP,
  GaragemResidencia: RESIDENCE_GARAGE_MAP,
  GaragemTrabalho: WORK_GARAGE_MAP,
  GaragemEstudo: STUDY_GARAGE_MAP,
  UsoVeiculo: VEHICLE_USAGE_MAP,
  TipoSeguro: INSURANCE_TYPE_MAP,
  RelacaoSeguradoCondutor: DRIVER_RELATIONSHIP_MAP,
  Rastreador: TRACKER_MAP,
  Antifurto: ANTITHEFT_MAP,
  ZeroKm: BOOLEAN_MAP,
  KitGas: BOOLEAN_MAP,
  Blindado: BOOLEAN_MAP,
  Alienado: BOOLEAN_MAP,
  Pcd: BOOLEAN_MAP,
  Sinistros: BOOLEAN_MAP,
} as const
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @repo/aggilizador exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/aggilizador/src/mappings/auto-enum-defaults.ts
git commit -m "feat(aggilizador): add hardcoded enum fallback mappings"
```

---

### Task 7: HTTP helper

**Files:**

- Create: `packages/aggilizador/src/http.ts`

- [ ] **Step 1: Create fetch wrapper**

```ts
import { AggilizadorApiError } from './errors.js'

interface RequestOptions {
  method: 'GET' | 'POST'
  url: string
  body?: unknown
}

export async function request<T>(options: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {}
  let bodyStr: string | undefined

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json;charset=UTF-8'
    bodyStr = JSON.stringify(options.body)
  }

  const response = await fetch(options.url, {
    method: options.method,
    headers,
    body: bodyStr,
  })

  if (response.status === 204) {
    return undefined as T
  }

  if (!response.ok) {
    let responseBody: unknown
    try {
      responseBody = await response.json()
    } catch {
      responseBody = await response.text()
    }
    throw new AggilizadorApiError(response.status, responseBody)
  }

  const text = await response.text()
  if (!text) {
    return undefined as T
  }

  return JSON.parse(text) as T
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @repo/aggilizador exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/aggilizador/src/http.ts
git commit -m "feat(aggilizador): add HTTP fetch wrapper with error handling"
```

---

### Task 8: Zod validation schemas

**Files:**

- Create: `packages/aggilizador/src/schemas.ts`

- [ ] **Step 1: Create Zod schemas for input validation**

```ts
import { z } from 'zod'

const phoneSchema = z.object({
  areaCode: z.string().min(2).max(2),
  number: z.string().min(8).max(9),
})

const insuredPersonSchema = z.object({
  cpf: z.string().min(11),
  fullName: z.string().min(3),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['MALE', 'FEMALE']),
  maritalStatus: z.enum([
    'MARRIED',
    'DIVORCED',
    'SEPARATED',
    'SINGLE',
    'WIDOWED',
  ]),
  cep: z.string().min(8),
  email: z.string().email(),
  cellPhone: phoneSchema.nullable(),
  homePhone: phoneSchema.nullable(),
})

const vehicleSchema = z.object({
  licensePlate: z.string().optional(),
  model: z.string().min(1),
  manufacturer: z.string().min(1),
  manufactureYear: z.number().int().min(1900).max(2100),
  modelYear: z.number().int().min(1900).max(2100),
  fipeCode: z.string().min(1),
  isZeroKm: z.boolean(),
  fuelType: z.enum([
    'FLEX',
    'GASOLINE',
    'ALCOHOL',
    'DIESEL',
    'HYBRID',
    'TETRAFUEL',
    'ELECTRIC',
  ]),
  overnightCep: z.string().min(8),
  tracker: z.enum([
    'NONE',
    'AUTOTRAC',
    'CAR_SYSTEM',
    'CELTEC',
    'CIELO',
    'GRABER',
    'ITURAN',
    'TRACKER',
    'OMNILINK',
    'POSITRON',
    'SASCAR',
    'DAF_V',
    'CEABS',
    'ONSTAR',
    'LO_JACK',
    'FACTORY_ORIGINAL',
    'SEGSAT',
    'SAT_COMPANY',
  ]),
  antitheft: z.enum([
    'NONE',
    'ALARM',
    'IGNITION_BLOCKER',
    'CARNEIRO_LOCK',
    'MULT_LOCK',
    'OTHER',
  ]),
  isFinanced: z.boolean(),
  hasGasKit: z.boolean(),
  isArmored: z.boolean(),
  chassisNumber: z.string().optional(),
})

const questionnaireSchema = z.object({
  residenceType: z.enum(['HOUSE', 'APARTMENT', 'CONDOMINIUM', 'OTHER']),
  residenceGarage: z.enum(['ELECTRONIC_GATE', 'MANUAL_GATE', 'NO_GARAGE']),
  workGarage: z.enum(['NOT_APPLICABLE', 'NO', 'YES', 'NOT_WORKING']),
  studyGarage: z.enum(['NOT_APPLICABLE', 'NO', 'YES', 'NOT_STUDENT']),
  vehicleUsage: z.enum(['PERSONAL', 'PROFESSIONAL', 'TAXI', 'APP_DRIVER']),
  monthlyMileage: z.number().int().min(0),
  isPcd: z.boolean(),
  livesWithUnder26: z.boolean(),
  profession: z.string().optional(),
  workDistance: z.string().optional(),
  usagePeriod: z.string().optional(),
})

const insuranceSchema = z.object({
  type: z.enum(['NEW', 'RENEWAL']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  commission: z.number().min(0).max(100),
  bonus: z.string().optional(),
  previousInsurer: z.string().optional(),
  previousPolicyNumber: z.string().optional(),
  hasClaims: z.boolean().optional(),
  observations: z.string().optional(),
})

const mainDriverSchema = z.object({
  cpf: z.string().min(11),
  fullName: z.string().min(3),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['MALE', 'FEMALE']),
  maritalStatus: z.enum([
    'MARRIED',
    'DIVORCED',
    'SEPARATED',
    'SINGLE',
    'WIDOWED',
  ]),
  licenseYears: z.number().int().min(1).max(11).optional(),
  relationship: z.enum([
    'SELF',
    'SPOUSE',
    'EMPLOYEE',
    'SIBLING',
    'CHILD',
    'MOTHER',
    'FATHER',
    'OTHER',
  ]),
})

export const autoQuoteInputSchema = z.object({
  brokerId: z.number().int().positive(),
  insuranceBroker: z.string().min(1),
  insured: insuredPersonSchema,
  vehicle: vehicleSchema,
  questionnaire: questionnaireSchema,
  insurance: insuranceSchema,
  mainDriver: mainDriverSchema,
})
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @repo/aggilizador exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/aggilizador/src/schemas.ts
git commit -m "feat(aggilizador): add Zod validation schemas for auto quote input"
```

---

### Task 9: Enum registry (dynamic + fallback)

**Files:**

- Create: `packages/aggilizador/src/mappings/enum-registry.ts`
- Create: `packages/aggilizador/src/mappings/enum-registry.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnumRegistry } from './enum-registry.js'
import { GENDER_MAP } from './auto-enum-defaults.js'

describe('EnumRegistry', () => {
  let registry: EnumRegistry

  beforeEach(() => {
    registry = new EnumRegistry('https://api.aggilizador.com.br')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves enum from hardcoded defaults when API is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    const result = await registry.resolve('Sexo', 'FEMALE')
    expect(result).toBe('2')
  })

  it('caches API response after first fetch', async () => {
    const mockResponse = {
      Sexo: [
        { Key: '1', Value: 'Masculino' },
        { Key: '2', Value: 'Feminino' },
      ],
    }
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      )

    await registry.resolve('Sexo', 'MALE')
    await registry.resolve('Sexo', 'FEMALE')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('invalidates cache on demand', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    await registry.resolve('Sexo', 'MALE')
    registry.invalidate()

    await registry.resolve('Sexo', 'MALE')
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('returns all enums for a given API field', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    const enums = await registry.getEnumList('Sexo')
    expect(enums).toEqual([
      { key: '1', value: 'Masculino' },
      { key: '2', value: 'Feminino' },
    ])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @repo/aggilizador exec vitest run src/mappings/enum-registry.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement enum registry**

```ts
import type { ApiAutoDataResponse } from '../types/api.js'
import type { EnumOption } from '../types/enums.js'
import { ALL_ENUM_DEFAULTS } from './auto-enum-defaults.js'

type EnumMap = Record<string, string>

const LABEL_TO_KEY: Record<string, Record<string, string>> = {
  Sexo: { MALE: 'Masculino', FEMALE: 'Feminino' },
  EstadoCivil: {
    MARRIED: 'Casado ou União Estável',
    DIVORCED: 'Divorciado',
    SEPARATED: 'Separado',
    SINGLE: 'Solteiro',
    WIDOWED: 'Viúvo',
  },
  Combustivel: {
    FLEX: 'Flex',
    GASOLINE: 'Gasolina',
    ALCOHOL: 'Álcool',
    DIESEL: 'Diesel',
    HYBRID: 'Híbrido',
    TETRAFUEL: 'Tetrafuel',
    ELECTRIC: 'Elétrico',
  },
  TipoResidencia: {
    HOUSE: 'Casa',
    APARTMENT: 'Apartamento',
    CONDOMINIUM: 'Condomínio',
    OTHER: 'Outros',
  },
  GaragemResidencia: {
    ELECTRONIC_GATE: 'Com portão eletrônico',
    MANUAL_GATE: 'Com portão manual',
    NO_GARAGE: 'Não possui garagem',
  },
  GaragemTrabalho: {
    NOT_APPLICABLE: 'Não utiliza para este fim',
    NO: 'Não',
    YES: 'Sim',
    NOT_WORKING: 'Não trabalha',
  },
  GaragemEstudo: {
    NOT_APPLICABLE: 'Não utiliza para este fim',
    NO: 'Não',
    YES: 'Sim',
    NOT_STUDENT: 'Não estuda',
  },
  UsoVeiculo: {
    PERSONAL: 'Particular',
    PROFESSIONAL: 'Profissional',
    TAXI: 'Taxi',
    APP_DRIVER: 'Motorista de App',
  },
  TipoSeguro: { NEW: 'Novo', RENEWAL: 'Renovação' },
  RelacaoSeguradoCondutor: {
    SELF: 'Próprio',
    SPOUSE: 'Cônjuge',
    EMPLOYEE: 'Empregado(a)',
    SIBLING: 'Irmão(ã)',
    CHILD: 'Filho(a)',
    MOTHER: 'Mãe',
    FATHER: 'Pai',
    OTHER: 'Outros',
  },
  Rastreador: {
    NONE: 'Não Possui',
    AUTOTRAC: 'AutoTrac',
    CAR_SYSTEM: 'Car System',
    CELTEC: 'Celtec',
    CIELO: 'Cielo',
    GRABER: 'Graber',
    ITURAN: 'Ituran',
    TRACKER: 'Tracker',
    OMNILINK: 'Omnilink',
    POSITRON: 'Positron',
    SASCAR: 'Sascar',
    DAF_V: 'DAF-V',
    CEABS: 'CEABS',
    ONSTAR: 'OnStar',
    LO_JACK: 'Lo Jack',
    FACTORY_ORIGINAL: 'Original de Fábrica',
    SEGSAT: 'SEGSAT',
    SAT_COMPANY: 'SAT COMPANY',
  },
  Antifurto: {
    NONE: 'Não Possui',
    ALARM: 'Alarme',
    IGNITION_BLOCKER: 'Bloqueador de Ignição',
    CARNEIRO_LOCK: 'Trava Carneiro',
    MULT_LOCK: 'Trava Mul-T-Lock',
    OTHER: 'Outros',
  },
}

export class EnumRegistry {
  private cache: ApiAutoDataResponse | null = null
  private fetchPromise: Promise<ApiAutoDataResponse | null> | null = null
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async resolve(apiField: string, ourKey: string): Promise<string> {
    const data = await this.loadEnums()

    if (data) {
      const labelMap = LABEL_TO_KEY[apiField]
      if (labelMap) {
        const label = labelMap[ourKey]
        if (label) {
          const match = data[apiField]?.find((opt) => opt.Value === label)
          if (match) return match.Key
        }
      }
    }

    const defaultMap = ALL_ENUM_DEFAULTS[
      apiField as keyof typeof ALL_ENUM_DEFAULTS
    ] as EnumMap | undefined
    if (defaultMap) {
      const value = defaultMap[ourKey]
      if (value !== undefined) return value
    }

    throw new Error(`Unknown enum: ${apiField}.${ourKey}`)
  }

  async getEnumList(apiField: string): Promise<EnumOption[]> {
    const data = await this.loadEnums()

    if (data?.[apiField]) {
      return data[apiField].map((opt) => ({ key: opt.Key, value: opt.Value }))
    }

    const defaultMap = ALL_ENUM_DEFAULTS[
      apiField as keyof typeof ALL_ENUM_DEFAULTS
    ] as EnumMap | undefined
    if (defaultMap) {
      const labelMap = LABEL_TO_KEY[apiField]
      return Object.entries(defaultMap).map(([ourKey, apiKey]) => ({
        key: apiKey,
        value: labelMap?.[ourKey] ?? ourKey,
      }))
    }

    return []
  }

  invalidate(): void {
    this.cache = null
    this.fetchPromise = null
  }

  private async loadEnums(): Promise<ApiAutoDataResponse | null> {
    if (this.cache) return this.cache

    if (!this.fetchPromise) {
      this.fetchPromise = this.fetchEnums()
    }

    return this.fetchPromise
  }

  private async fetchEnums(): Promise<ApiAutoDataResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/Auto/Data`)
      if (!response.ok) return null
      const data = (await response.json()) as ApiAutoDataResponse
      this.cache = data
      return data
    } catch {
      return null
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @repo/aggilizador exec vitest run src/mappings/enum-registry.spec.ts`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/aggilizador/src/mappings/enum-registry.ts packages/aggilizador/src/mappings/enum-registry.spec.ts
git commit -m "feat(aggilizador): add dynamic enum registry with cache and fallback"
```

---

### Task 10: Auto payload builder

**Files:**

- Create: `packages/aggilizador/src/builders/auto-payload-builder.ts`
- Create: `packages/aggilizador/src/builders/auto-payload-builder.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoPayloadBuilder } from './auto-payload-builder.js'
import type { EnumRegistry } from '../mappings/enum-registry.js'
import type { AutoQuoteInput } from '../types/auto.js'

const SAMPLE_INPUT: AutoQuoteInput = {
  brokerId: 1366,
  insuranceBroker: 'lojacorr',
  insured: {
    cpf: '529.982.247-25',
    fullName: 'MARIA DA SILVA SANTOS',
    birthDate: '1985-03-15',
    gender: 'FEMALE',
    maritalStatus: 'MARRIED',
    cep: '01310-100',
    email: 'maria@email.com',
    cellPhone: { areaCode: '11', number: '999998888' },
    homePhone: null,
  },
  vehicle: {
    model: 'HB20S COPA MUNDO QATAR 1.0 FLEX MEC.',
    manufacturer: 'HYUNDAI',
    manufactureYear: 2022,
    modelYear: 2023,
    fipeCode: '015220-0',
    isZeroKm: false,
    fuelType: 'FLEX',
    overnightCep: '01310-100',
    tracker: 'NONE',
    antitheft: 'NONE',
    isFinanced: false,
    hasGasKit: false,
    isArmored: false,
  },
  questionnaire: {
    residenceType: 'APARTMENT',
    residenceGarage: 'ELECTRONIC_GATE',
    workGarage: 'YES',
    studyGarage: 'NOT_STUDENT',
    vehicleUsage: 'PERSONAL',
    monthlyMileage: 1500,
    isPcd: false,
    livesWithUnder26: false,
  },
  insurance: {
    type: 'NEW',
    startDate: '2026-04-16',
    endDate: '2027-04-16',
    commission: 10,
  },
  mainDriver: {
    cpf: '529.982.247-25',
    fullName: 'MARIA DA SILVA SANTOS',
    birthDate: '1985-03-15',
    gender: 'FEMALE',
    maritalStatus: 'MARRIED',
    relationship: 'SELF',
  },
}

function createMockRegistry(): EnumRegistry {
  return {
    resolve: vi.fn(async (_field: string, key: string) => {
      const map: Record<string, string> = {
        FEMALE: '2',
        MARRIED: '1',
        FLEX: '1',
        APARTMENT: '2',
        ELECTRONIC_GATE: '1',
        YES: '2',
        NOT_STUDENT: '3',
        PERSONAL: '0',
        NONE: '0',
        NEW: '0',
        SELF: '0',
        NO: '0',
      }
      return map[key] ?? '0'
    }),
  } as unknown as EnumRegistry
}

describe('AutoPayloadBuilder', () => {
  let builder: AutoPayloadBuilder
  let registry: EnumRegistry

  beforeEach(() => {
    registry = createMockRegistry()
    builder = new AutoPayloadBuilder(registry)
  })

  it('builds contact payload with correct structure', async () => {
    const payload = await builder.buildContactPayload(SAMPLE_INPUT)

    expect(payload.BrokerId).toBe(1366)
    expect(payload.InsuranceBroker).toBe('lojacorr')
    expect(payload.CalculationType).toBe(1)
    expect(payload.Id).toBeNull()
    expect(payload.Data.CpfCnpj).toBe('529.982.247-25')
    expect(payload.Data.NomeCompleto).toBe('MARIA DA SILVA SANTOS')
    expect(payload.Data.Sexo).toBe('2')
    expect(payload.Data.EstadoCivil).toBe('1')
    expect(payload.Data.Email).toBe('maria@email.com')
    expect(payload.Data.TelefoneCelular).toEqual({
      Ddd: '(11)',
      Numero: '99999-8888',
    })
    expect(payload.Data.TelefoneResidencial).toEqual({
      Ddd: null,
      Numero: null,
    })
  })

  it('formats phone number with parentheses and dash', async () => {
    const payload = await builder.buildContactPayload(SAMPLE_INPUT)
    expect(payload.Data.TelefoneCelular.Ddd).toBe('(11)')
    expect(payload.Data.TelefoneCelular.Numero).toBe('99999-8888')
  })

  it('formats birth date to UTC-3 ISO string', async () => {
    const payload = await builder.buildContactPayload(SAMPLE_INPUT)
    expect(payload.Data.DataNascimento).toBe('1985-03-15T03:00:00.000Z')
  })

  it('builds submit payload with all sections', async () => {
    const payload = await builder.buildSubmitPayload(SAMPLE_INPUT, 'abc123')

    expect(payload.Id).toBe('abc123')
    expect(payload.BrokerId).toBe(1366)
    expect(payload.InsuranceBroker).toBe('lojacorr')
    expect(payload.Type).toBe(0)
    expect(payload.Renovation).toBe(false)
    expect(payload.CalculationAuto).toBeDefined()
    expect(payload.CalculationAuto.Segurado.CpfCnpj).toBe('529.982.247-25')
    expect(payload.CalculationAuto.Veiculo.Modelo).toBe(
      'HB20S COPA MUNDO QATAR 1.0 FLEX MEC.'
    )
    expect(payload.CalculationAuto.Veiculo.CodigoFipe).toBe('015220-0')
    expect(payload.CalculationAuto.Questionario.QuilometragemMensal).toBe(
      '1500'
    )
    expect(payload.CalculationAuto.Seguro.Comissao).toBe('10')
    expect(payload.CalculationAuto.CondutorPrincipal.CpfCnpj).toBe(
      '529.982.247-25'
    )
    expect(payload.CalculationResidence).toBeNull()
    expect(payload.CalculationLife).toBeNull()
  })

  it('maps boolean fields to string 0/1', async () => {
    const payload = await builder.buildSubmitPayload(SAMPLE_INPUT, 'abc123')

    expect(payload.CalculationAuto.Veiculo.ZeroKm).toBe('0')
    expect(payload.CalculationAuto.Veiculo.KitGas).toBe('0')
    expect(payload.CalculationAuto.Veiculo.Blindado).toBe('0')
    expect(payload.CalculationAuto.Veiculo.Alienado).toBe('0')
    expect(payload.CalculationAuto.Questionario.Pcd).toBe('0')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @repo/aggilizador exec vitest run src/builders/auto-payload-builder.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement payload builder**

```ts
import type { EnumRegistry } from '../mappings/enum-registry.js'
import type { AutoQuoteInput } from '../types/auto.js'
import type { PhoneInput } from '../types/common.js'
import type {
  ApiAutoSubmitPayload,
  ApiContactPayload,
  ApiDriver,
  ApiInsurance,
  ApiInsured,
  ApiPhone,
  ApiQuestionnaire,
  ApiVehicle,
} from '../types/api.js'

export class AutoPayloadBuilder {
  constructor(private readonly registry: EnumRegistry) {}

  async buildContactPayload(input: AutoQuoteInput): Promise<ApiContactPayload> {
    const insured = await this.buildInsured(input)
    return {
      CalculationType: 1,
      Id: null,
      BrokerId: input.brokerId,
      InsuranceBroker: input.insuranceBroker,
      Data: insured,
    }
  }

  async buildSubmitPayload(
    input: AutoQuoteInput,
    id: string
  ): Promise<ApiAutoSubmitPayload> {
    const [insured, vehicle, questionnaire, insurance, driver] =
      await Promise.all([
        this.buildInsured(input),
        this.buildVehicle(input),
        this.buildQuestionnaire(input),
        this.buildInsurance(input),
        this.buildDriver(input),
      ])
    insured.Perfil = true

    return {
      Id: id,
      OnlineId: null,
      BrokerId: input.brokerId,
      DeviceId: null,
      InsuranceBroker: input.insuranceBroker,
      CalculationAuto: {
        Segurado: insured,
        CondutorPrincipal: driver,
        Veiculo: vehicle,
        Questionario: questionnaire,
        Caminhao: null,
        Cobertura: null,
        Seguro: insurance,
      },
      CalculationResidence: null,
      CalculationCondominium: null,
      CalculationSeveral: null,
      CalculationLife: null,
      CalculationLifeGlobal: null,
      CalculationBusiness: null,
      CalculationTravel: null,
      CalculationBike: null,
      CalculationRent: null,
      Renovation: input.insurance.type === 'RENEWAL',
      Type: 0,
    }
  }

  private async buildInsured(input: AutoQuoteInput): Promise<ApiInsured> {
    const { insured, mainDriver } = input
    const [gender, maritalStatus] = await Promise.all([
      this.registry.resolve('Sexo', insured.gender),
      this.registry.resolve('EstadoCivil', insured.maritalStatus),
    ])

    return {
      CpfCnpj: insured.cpf,
      NomeCompleto: insured.fullName,
      DataNascimento: formatDateToApi(insured.birthDate),
      Sexo: gender,
      EstadoCivil: maritalStatus,
      TempoHabilitacao: mainDriver.licenseYears
        ? String(mainDriver.licenseYears)
        : '',
      NumeroHabilitacao: '',
      Cep: insured.cep,
      Email: insured.email,
      TelefoneResidencial: formatPhone(insured.homePhone),
      TelefoneCelular: formatPhone(insured.cellPhone),
      RelacaoSeguradoCondutor: await this.registry.resolve(
        'RelacaoSeguradoCondutor',
        mainDriver.relationship
      ),
    }
  }

  private async buildVehicle(input: AutoQuoteInput): Promise<ApiVehicle> {
    const { vehicle } = input
    const [fuelType, tracker, antitheft] = await Promise.all([
      this.registry.resolve('Combustivel', vehicle.fuelType),
      this.registry.resolve('Rastreador', vehicle.tracker),
      this.registry.resolve('Antifurto', vehicle.antitheft),
    ])

    return {
      NumeroChassi: vehicle.chassisNumber ?? '',
      Placa: vehicle.licensePlate ?? '',
      Modelo: vehicle.model,
      Fabricante: vehicle.manufacturer,
      AnoFabricacao: String(vehicle.manufactureYear),
      AnoModelo: String(vehicle.modelYear),
      CodigoFipe: vehicle.fipeCode,
      ZeroKm: boolToApi(vehicle.isZeroKm),
      Rastreador: tracker,
      Antifurto: antitheft,
      Alienado: boolToApi(vehicle.isFinanced),
      Combustivel: fuelType,
      CepPernoite: vehicle.overnightCep,
      KitGas: boolToApi(vehicle.hasGasKit),
      Blindado: boolToApi(vehicle.isArmored),
      Fipe: {
        Modelo: vehicle.model,
        Marca: vehicle.manufacturer,
        Codigo: vehicle.fipeCode,
        TipoVeiculo: 0,
      },
    }
  }

  private async buildQuestionnaire(
    input: AutoQuoteInput
  ): Promise<ApiQuestionnaire> {
    const { questionnaire } = input
    const [
      residenceType,
      residenceGarage,
      workGarage,
      studyGarage,
      vehicleUsage,
    ] = await Promise.all([
      this.registry.resolve('TipoResidencia', questionnaire.residenceType),
      this.registry.resolve('GaragemResidencia', questionnaire.residenceGarage),
      this.registry.resolve('GaragemTrabalho', questionnaire.workGarage),
      this.registry.resolve('GaragemEstudo', questionnaire.studyGarage),
      this.registry.resolve('UsoVeiculo', questionnaire.vehicleUsage),
    ])

    return {
      TipoResidencia: residenceType,
      VeiculosResidencia: '',
      QuilometragemMensal: String(questionnaire.monthlyMileage),
      GaragemTrabalho: workGarage,
      GaragemResidencia: residenceGarage,
      GaragemEstudo: studyGarage,
      UsoVeiculo: vehicleUsage,
      UsoDependentes: questionnaire.livesWithUnder26 ? '1' : '0',
      FaixaEtariaDependentes: '',
      DistanciaResidenciaTrabalho: questionnaire.workDistance ?? '',
      Profissao: questionnaire.profession ?? null,
      Associado: '',
      PeriodoUso: questionnaire.usagePeriod ?? '',
      Pcd: boolToApi(questionnaire.isPcd),
      IsencaoFiscal: null,
    }
  }

  private async buildInsurance(input: AutoQuoteInput): Promise<ApiInsurance> {
    const { insurance } = input
    const insuranceType = await this.registry.resolve(
      'TipoSeguro',
      insurance.type
    )

    return {
      Banco: '0',
      Bonus: insurance.bonus ?? '',
      TipoSeguro: insuranceType,
      VigenciaInicial: formatDateToApi(insurance.startDate),
      VigenciaFinal: formatDateToApi(insurance.endDate),
      VigenciaFinalAnterior: null,
      SeguradoraAnterior: insurance.previousInsurer ?? '',
      CodigoIdentificacao: '',
      NumeroApoliceAnterior: insurance.previousPolicyNumber ?? '',
      Sinistros: insurance.hasClaims ? '1' : '0',
      Comissao: String(insurance.commission),
      Agenciamento: '0',
      Observacoes: insurance.observations ?? '',
      RenovacaoGarantida: false,
      ComissaoSeguradora: null,
    }
  }

  private async buildDriver(input: AutoQuoteInput): Promise<ApiDriver> {
    const { mainDriver } = input
    const [gender, maritalStatus] = await Promise.all([
      this.registry.resolve('Sexo', mainDriver.gender),
      this.registry.resolve('EstadoCivil', mainDriver.maritalStatus),
    ])

    return {
      CpfCnpj: mainDriver.cpf,
      NomeCompleto: mainDriver.fullName,
      DataNascimento: formatDateToApi(mainDriver.birthDate),
      Sexo: gender,
      EstadoCivil: maritalStatus,
      TempoHabilitacao: mainDriver.licenseYears
        ? String(mainDriver.licenseYears)
        : '',
      NumeroHabilitacao: '',
    }
  }
}

function formatDateToApi(isoDate: string): string {
  return `${isoDate}T03:00:00.000Z`
}

function formatPhone(phone: PhoneInput | null): ApiPhone {
  if (!phone) return { Ddd: null, Numero: null }
  const raw = phone.number.replace(/\D/g, '')
  const formatted =
    raw.length === 9
      ? `${raw.slice(0, 5)}-${raw.slice(5)}`
      : `${raw.slice(0, 4)}-${raw.slice(4)}`
  return {
    Ddd: `(${phone.areaCode})`,
    Numero: formatted,
  }
}

function boolToApi(value: boolean): string {
  return value ? '1' : '0'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @repo/aggilizador exec vitest run src/builders/auto-payload-builder.spec.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/aggilizador/src/builders/
git commit -m "feat(aggilizador): add auto payload builder with enum resolution"
```

---

### Task 11: FIPE client

**Files:**

- Create: `packages/aggilizador/src/fipe/fipe-client.ts`
- Create: `packages/aggilizador/src/fipe/fipe-client.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FipeClient } from './fipe-client.js'

describe('FipeClient', () => {
  let client: FipeClient

  beforeEach(() => {
    client = new FipeClient('https://fipe.agger.com.br')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('searches models by name and year', async () => {
    const mockModels = [
      {
        Modelo: 'HB20 1.0',
        Marca: 'HYUNDAI',
        Codigo: '015220-0',
        TipoVeiculo: 0,
      },
    ]
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify('mock-token'), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockModels), { status: 200 })
      )

    const result = await client.searchModels({ model: 'HB20', year: 2023 })

    expect(result).toEqual([
      {
        model: 'HB20 1.0',
        manufacturer: 'HYUNDAI',
        fipeCode: '015220-0',
        vehicleType: 0,
      },
    ])
  })

  it('returns empty array when search has no results', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify('mock-token'), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))

    const result = await client.searchModels({
      model: 'XYZNONEXIST',
      year: 2023,
    })
    expect(result).toEqual([])
  })

  it('caches auth token across calls', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify('token1'), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))

    await client.searchModels({ model: 'A', year: 2023 })
    await client.searchModels({ model: 'B', year: 2023 })

    // auth called once, search called twice = 3 total
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @repo/aggilizador exec vitest run src/fipe/fipe-client.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement FIPE client**

```ts
import type { FipeModel, FipeSearchInput } from '../types/auto.js'

interface ApiFipeModel {
  Modelo: string
  Marca: string
  Codigo: string
  TipoVeiculo: number
}

export class FipeClient {
  private readonly baseUrl: string
  private authToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async searchModels(input: FipeSearchInput): Promise<FipeModel[]> {
    await this.ensureAuthenticated()

    const url = `${this.baseUrl}/v1/fipe/modeloeano?modelo=${encodeURIComponent(input.model)}&ano=${input.year}`
    const response = await fetch(url, {
      headers: this.authToken
        ? { Authorization: `Bearer ${this.authToken}` }
        : {},
    })

    if (!response.ok) return []

    const models = (await response.json()) as ApiFipeModel[]
    return models.map((m) => ({
      model: m.Modelo,
      manufacturer: m.Marca,
      fipeCode: m.Codigo,
      vehicleType: m.TipoVeiculo,
    }))
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.authToken) return

    const today = new Date().toLocaleDateString('pt-BR')
    const credentials = Buffer.from(
      `2|bc3fd5a-59ab-4ab5-97a1-7b1709eb9475|${today}`
    ).toString('base64')

    const response = await fetch(`${this.baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })

    if (response.ok) {
      const token = await response.json()
      this.authToken = typeof token === 'string' ? token : null
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @repo/aggilizador exec vitest run src/fipe/fipe-client.spec.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/aggilizador/src/fipe/
git commit -m "feat(aggilizador): add FIPE model search client with auth caching"
```

---

### Task 12: AutoQuoteService

**Files:**

- Create: `packages/aggilizador/src/branches/auto.ts`
- Create: `packages/aggilizador/src/branches/auto.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutoQuoteService } from './auto.js'
import type { EnumRegistry } from '../mappings/enum-registry.js'
import type { AutoPayloadBuilder } from '../builders/auto-payload-builder.js'
import type { AutoQuoteInput } from '../types/auto.js'

const SAMPLE_INPUT: AutoQuoteInput = {
  brokerId: 1366,
  insuranceBroker: 'lojacorr',
  insured: {
    cpf: '529.982.247-25',
    fullName: 'MARIA DA SILVA SANTOS',
    birthDate: '1985-03-15',
    gender: 'FEMALE',
    maritalStatus: 'MARRIED',
    cep: '01310-100',
    email: 'maria@email.com',
    cellPhone: { areaCode: '11', number: '999998888' },
    homePhone: null,
  },
  vehicle: {
    model: 'HB20S 1.0',
    manufacturer: 'HYUNDAI',
    manufactureYear: 2022,
    modelYear: 2023,
    fipeCode: '015220-0',
    isZeroKm: false,
    fuelType: 'FLEX',
    overnightCep: '01310-100',
    tracker: 'NONE',
    antitheft: 'NONE',
    isFinanced: false,
    hasGasKit: false,
    isArmored: false,
  },
  questionnaire: {
    residenceType: 'APARTMENT',
    residenceGarage: 'ELECTRONIC_GATE',
    workGarage: 'YES',
    studyGarage: 'NOT_STUDENT',
    vehicleUsage: 'PERSONAL',
    monthlyMileage: 1500,
    isPcd: false,
    livesWithUnder26: false,
  },
  insurance: {
    type: 'NEW',
    startDate: '2026-04-16',
    endDate: '2027-04-16',
    commission: 10,
  },
  mainDriver: {
    cpf: '529.982.247-25',
    fullName: 'MARIA DA SILVA SANTOS',
    birthDate: '1985-03-15',
    gender: 'FEMALE',
    maritalStatus: 'MARRIED',
    relationship: 'SELF',
  },
}

describe('AutoQuoteService', () => {
  let service: AutoQuoteService
  let mockBuilder: AutoPayloadBuilder
  let mockRegistry: EnumRegistry

  beforeEach(() => {
    mockBuilder = {
      buildContactPayload: vi.fn().mockResolvedValue({ BrokerId: 1366 }),
      buildSubmitPayload: vi
        .fn()
        .mockResolvedValue({ Id: 'abc', BrokerId: 1366 }),
    } as unknown as AutoPayloadBuilder

    mockRegistry = {
      getEnumList: vi
        .fn()
        .mockResolvedValue([{ key: '1', value: 'Masculino' }]),
    } as unknown as EnumRegistry

    service = new AutoQuoteService(
      'https://api.aggilizador.com.br',
      mockBuilder,
      mockRegistry
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('submits a quote via Contact then Auto endpoints', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ Id: 'mongo123', ErrorMessages: [] }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify('mongo123'), { status: 200 })
      )

    const result = await service.submitQuote(SAMPLE_INPUT)

    expect(result).toEqual({ id: 'mongo123' })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      'https://api.aggilizador.com.br/Auto/Contact'
    )
    expect(fetchSpy.mock.calls[1]?.[0]).toBe(
      'https://api.aggilizador.com.br/Auto'
    )
    expect(mockBuilder.buildContactPayload).toHaveBeenCalledWith(SAMPLE_INPUT)
    expect(mockBuilder.buildSubmitPayload).toHaveBeenCalledWith(
      SAMPLE_INPUT,
      'mongo123'
    )
  })

  it('throws AggilizadorBusinessError when Contact returns errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ Id: '', ErrorMessages: ['CPF inválido'] }),
        { status: 200 }
      )
    )

    await expect(service.submitQuote(SAMPLE_INPUT)).rejects.toThrow(
      'CPF inválido'
    )
  })

  it('delegates getEnums to registry', async () => {
    const enums = await service.getEnums()
    expect(mockRegistry.getEnumList).toHaveBeenCalled()
    expect(enums.gender).toEqual([{ key: '1', value: 'Masculino' }])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @repo/aggilizador exec vitest run src/branches/auto.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement AutoQuoteService**

```ts
import { AggilizadorBusinessError } from '../errors.js'
import { request } from '../http.js'
import type { AutoPayloadBuilder } from '../builders/auto-payload-builder.js'
import type { EnumRegistry } from '../mappings/enum-registry.js'
import type { AutoQuoteInput } from '../types/auto.js'
import type { QuoteResult } from '../types/common.js'
import type { ApiContactResponse } from '../types/api.js'
import type { AutoEnums } from '../types/auto-enums.js'
import type { EnumOption } from '../types/enums.js'
import { autoQuoteInputSchema } from '../schemas.js'
import { AggilizadorValidationError } from '../errors.js'

const ENUM_FIELDS = [
  ['gender', 'Sexo'],
  ['maritalStatus', 'EstadoCivil'],
  ['fuelType', 'Combustivel'],
  ['residenceType', 'TipoResidencia'],
  ['residenceGarage', 'GaragemResidencia'],
  ['workGarage', 'GaragemTrabalho'],
  ['studyGarage', 'GaragemEstudo'],
  ['vehicleUsage', 'UsoVeiculo'],
  ['insuranceType', 'TipoSeguro'],
  ['tracker', 'Rastreador'],
  ['antitheft', 'Antifurto'],
  ['previousInsurer', 'SeguradoraAnterior'],
  ['bonus', 'Bonus'],
  ['bank', 'Banco'],
  ['licenseYears', 'TempoHabilitacao'],
  ['driverRelationship', 'RelacaoSeguradoCondutor'],
] as const

export class AutoQuoteService {
  constructor(
    private readonly baseUrl: string,
    private readonly builder: AutoPayloadBuilder,
    private readonly registry: EnumRegistry
  ) {}

  async submitQuote(input: AutoQuoteInput): Promise<QuoteResult> {
    const parseResult = autoQuoteInputSchema.safeParse(input)
    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parseResult.error.issues) {
        const path = issue.path.join('.')
        fieldErrors[path] = fieldErrors[path] ?? []
        fieldErrors[path].push(issue.message)
      }
      throw new AggilizadorValidationError(fieldErrors)
    }

    const contactPayload = await this.builder.buildContactPayload(input)
    const contactResult = await request<ApiContactResponse>({
      method: 'POST',
      url: `${this.baseUrl}/Auto/Contact`,
      body: contactPayload,
    })

    if (contactResult.ErrorMessages.length > 0) {
      throw new AggilizadorBusinessError(contactResult.ErrorMessages)
    }

    const submitPayload = await this.builder.buildSubmitPayload(
      input,
      contactResult.Id
    )
    await request<string>({
      method: 'POST',
      url: `${this.baseUrl}/Auto`,
      body: submitPayload,
    })

    return { id: contactResult.Id }
  }

  async getEnums(): Promise<Record<string, EnumOption[]>> {
    const entries = await Promise.all(
      ENUM_FIELDS.map(async ([name, apiField]) => {
        const list = await this.registry.getEnumList(apiField)
        return [name, list] as const
      })
    )
    return Object.fromEntries(entries)
  }
}
```

Note: the `AutoEnums` import may need adjustment — it references a type not yet created. If the test imports fail on that type, remove the import and use `Record<string, EnumOption[]>` as the return type directly. The spec lists `AutoEnums` but the runtime return type is equivalent.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @repo/aggilizador exec vitest run src/branches/auto.spec.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/aggilizador/src/branches/
git commit -m "feat(aggilizador): add AutoQuoteService with validation and 2-step submit"
```

---

### Task 13: AggilizadorClient + index exports

**Files:**

- Create: `packages/aggilizador/src/client.ts`
- Modify: `packages/aggilizador/src/index.ts`

- [ ] **Step 1: Create AggilizadorClient**

```ts
import type { ClientConfig } from './types/common.js'
import { EnumRegistry } from './mappings/enum-registry.js'
import { AutoPayloadBuilder } from './builders/auto-payload-builder.js'
import { AutoQuoteService } from './branches/auto.js'
import { FipeClient } from './fipe/fipe-client.js'

const DEFAULT_BASE_URL = 'https://api.aggilizador.com.br'
const DEFAULT_FIPE_BASE_URL = 'https://fipe.agger.com.br'

export class AggilizadorClient {
  readonly auto: AutoQuoteService
  readonly fipe: FipeClient

  constructor(config?: ClientConfig) {
    const baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL
    const fipeBaseUrl = config?.fipeBaseUrl ?? DEFAULT_FIPE_BASE_URL

    const registry = new EnumRegistry(baseUrl)
    const builder = new AutoPayloadBuilder(registry)

    this.auto = new AutoQuoteService(baseUrl, builder, registry)
    this.fipe = new FipeClient(fipeBaseUrl)
  }
}
```

- [ ] **Step 2: Wire up index.ts with all public exports**

```ts
export { AggilizadorClient } from './client.js'
export { AutoQuoteService } from './branches/auto.js'
export { FipeClient } from './fipe/fipe-client.js'

export {
  AggilizadorApiError,
  AggilizadorBusinessError,
  AggilizadorError,
  AggilizadorValidationError,
} from './errors.js'

export type { ClientConfig, QuoteResult } from './types/common.js'
export type { InsuredPersonInput, PhoneInput } from './types/common.js'
export type {
  AutoQuoteInput,
  FipeModel,
  FipeSearchInput,
  InsuranceInput,
  MainDriverInput,
  QuestionnaireInput,
  VehicleInput,
} from './types/auto.js'
export type {
  AntitheftType,
  BooleanOption,
  DriverRelationship,
  EnumOption,
  FuelType,
  Gender,
  InsuranceType,
  MaritalStatus,
  ResidenceGarageType,
  ResidenceType,
  StudyGarageType,
  TrackerType,
  VehicleUsage,
  WorkGarageType,
} from './types/enums.js'
```

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @repo/aggilizador exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/aggilizador/src/client.ts packages/aggilizador/src/index.ts
git commit -m "feat(aggilizador): add AggilizadorClient and wire up public exports"
```

---

### Task 14: Full quality gate verification

**Files:** None (verification only)

- [ ] **Step 1: Run all package tests**

Run: `pnpm --filter @repo/aggilizador test`
Expected: All tests PASS

- [ ] **Step 2: Run typecheck from root**

Run: `pnpm typecheck`
Expected: No errors across entire monorepo

- [ ] **Step 3: Run lint from root**

Run: `pnpm lint`
Expected: No errors (fix any lint issues before committing)

- [ ] **Step 4: Run build from root**

Run: `pnpm build`
Expected: Successful build (the package itself has no build step, but verify it doesn't break other builds)

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(aggilizador): address lint and typecheck issues"
```

---

## Dependency Graph

```
Task 1 (scaffold)
├── Task 2 (errors)
├── Task 3 (enum types)
├── Task 4 (common + auto types) ← depends on Task 3
├── Task 5 (API types) ← standalone
├── Task 6 (enum defaults) ← standalone
├── Task 7 (HTTP helper) ← depends on Task 2
├── Task 8 (Zod schemas) ← depends on Task 3
├── Task 9 (enum registry) ← depends on Tasks 5, 6
├── Task 10 (payload builder) ← depends on Tasks 4, 5, 9
├── Task 11 (FIPE client) ← depends on Task 4
├── Task 12 (AutoQuoteService) ← depends on Tasks 7, 8, 9, 10
├── Task 13 (client + exports) ← depends on Tasks 11, 12
└── Task 14 (quality gates) ← depends on all
```
