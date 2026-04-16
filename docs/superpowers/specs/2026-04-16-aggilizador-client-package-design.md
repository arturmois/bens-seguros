# Aggilizador Client Package Design

**Date:** 2026-04-16
**Status:** Approved
**Scope:** `packages/aggilizador` — TypeScript client for the Aggilizador (Agger) insurance quote API

---

## Context

Bens Seguros uses Lojacorr's Aggilizador web form to submit insurance quotes manually. The Aggilizador has no documented public API, but a Playwright exploration of the form revealed a clean REST API at `api.aggilizador.com.br` with no authentication (only a `BrokerId` + `InsuranceBroker` identifier per request).

This package wraps that API as a reusable, stateless TypeScript client. It does not define how or when quotes are submitted — that integration decision is deferred. The package simply provides the capability.

---

## API Discovery Summary

### Base URL

`https://api.aggilizador.com.br`

### Endpoints (Auto branch)

| Endpoint                             | Method   | Purpose                                         | Response                            |
| ------------------------------------ | -------- | ----------------------------------------------- | ----------------------------------- |
| `GET /Domain/{broker}?BrokerId={id}` | GET      | Broker config/validation                        | Broker metadata                     |
| `GET /Auto/Data`                     | GET      | Form enums and dropdown options (48 enum lists) | JSON with all Key/Value arrays      |
| `POST /Auto/Contact`                 | POST     | Create quote record, returns Id                 | `{ Id: string, ErrorMessages: [] }` |
| `POST /Auto/Insured`                 | POST     | Save insured person data                        | 204 No Content                      |
| `POST /Auto/Vehicle`                 | POST     | Save vehicle data                               | 204 No Content                      |
| `POST /Auto/Insurance`               | POST     | Save insurance details                          | 204 No Content                      |
| `POST /Auto/Questionnaire`           | POST     | Save questionnaire answers                      | 204 No Content                      |
| `POST /Auto/Driver`                  | POST     | Save main driver data                           | 204 No Content                      |
| **`POST /Auto`**                     | **POST** | **Final submit — all data consolidated**        | `"<mongoId>"` (string)              |

### FIPE API (vehicle model lookup)

| Endpoint                                                              | Method | Purpose                      |
| --------------------------------------------------------------------- | ------ | ---------------------------- |
| `POST https://fipe.agger.com.br/api/auth`                             | POST   | Authenticate (base64 token)  |
| `GET https://fipe.agger.com.br/v1/fipe/modeloeano?modelo={q}&ano={y}` | GET    | Search models by name + year |

### Authentication

**None.** No Bearer tokens, API keys, or cookies. Requests are identified only by `BrokerId` (number) and `InsuranceBroker` (string, e.g. `"lojacorr"`). These are per-tenant values in our multi-tenant SaaS context.

### Submit Flow (2 requests)

1. **`POST /Auto/Contact`** — Creates the quote record server-side, returns a MongoDB ObjectId (`Id`)
2. **`POST /Auto`** — Sends all consolidated data (insured, vehicle, questionnaire, insurance, driver) with the `Id` from step 1. Returns the same `Id` as confirmation.

The intermediate step-by-step endpoints (`/Auto/Insured`, `/Auto/Vehicle`, etc.) are used by the web form's wizard but are not strictly required — the final `POST /Auto` sends everything. However, the `POST /Auto/Contact` is required to obtain the `Id`.

---

## Package Structure

```
packages/aggilizador/
├── src/
│   ├── index.ts                    # Public exports
│   ├── client.ts                   # AggilizadorClient class
│   ├── http.ts                     # HTTP helper (fetch wrapper with error handling)
│   ├── errors.ts                   # AggilizadorApiError, AggilizadorValidationError
│   ├── types/
│   │   ├── common.ts               # Shared types (InsuredPerson, ContactInfo, etc.)
│   │   ├── auto.ts                 # Auto-specific types (Vehicle, Questionnaire, Coverage)
│   │   ├── enums.ts                # Typed enum maps from /Auto/Data
│   │   └── api.ts                  # Raw API request/response shapes
│   ├── branches/
│   │   └── auto.ts                 # AutoQuoteService
│   └── fipe/
│       └── fipe-client.ts          # FipeClient (model search)
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

---

## Public API

### AggilizadorClient

```ts
import { AggilizadorClient } from '@repo/aggilizador'

const client = new AggilizadorClient()

// Auto insurance quote
const result = await client.auto.submitQuote({
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
    licensePlate: '', // optional
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
    chassisNumber: '', // optional
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
    observations: '',
  },
  mainDriver: {
    cpf: '529.982.247-25',
    fullName: 'MARIA DA SILVA SANTOS',
    birthDate: '1985-03-15',
    gender: 'FEMALE',
    maritalStatus: 'MARRIED',
    licenseYears: null, // optional
    relationship: 'SELF',
  },
})
// result: { id: '69e0d529f2470d2d52e8e8c2' }
```

### FipeClient

```ts
const models = await client.fipe.searchModels({
  model: 'HB20',
  year: 2023,
})
// models: Array<{ model: string, manufacturer: string, fipeCode: string, vehicleType: number }>
```

### Enums

```ts
const enums = await client.auto.getEnums()
// enums: {
//   gender: [{ key: '1', value: 'Masculino' }, { key: '2', value: 'Feminino' }],
//   maritalStatus: [...],
//   fuelType: [...],
//   residenceType: [...],
//   ...48 enum lists
// }
```

---

## Type Definitions

### Enums (typed string unions for inputs)

```ts
// Gender
type Gender = 'MALE' | 'FEMALE'
// Maps to API: MALE → '1', FEMALE → '2'

// MaritalStatus
type MaritalStatus = 'MARRIED' | 'DIVORCED' | 'SEPARATED' | 'SINGLE' | 'WIDOWED'
// Maps to API: MARRIED → '1', DIVORCED → '2', SEPARATED → '3', SINGLE → '4', WIDOWED → '5'

// FuelType
type FuelType = 'FLEX' | 'GASOLINE' | 'ALCOHOL' | 'DIESEL' | 'HYBRID' | 'TETRAFUEL' | 'ELECTRIC'
// Maps to API: FLEX → '1', GASOLINE → '2', ALCOHOL → '3', DIESEL → '4', HYBRID → '5', TETRAFUEL → '6', ELECTRIC → '7'

// ResidenceType
type ResidenceType = 'HOUSE' | 'APARTMENT' | 'CONDOMINIUM' | 'OTHER'
// Maps to API: HOUSE → '1', APARTMENT → '2', CONDOMINIUM → '3', OTHER → '4'

// GarageType (residence)
type ResidenceGarageType = 'ELECTRONIC_GATE' | 'MANUAL_GATE' | 'NO_GARAGE'
// Maps to API: ELECTRONIC_GATE → '1', MANUAL_GATE → '2', NO_GARAGE → '3'

// GarageType (work)
type WorkGarageType = 'NOT_APPLICABLE' | 'NO' | 'YES' | 'NOT_WORKING'
// Maps to API: NOT_APPLICABLE → '0', NO → '1', YES → '2', NOT_WORKING → '3'

// GarageType (study)
type StudyGarageType = 'NOT_APPLICABLE' | 'NO' | 'YES' | 'NOT_STUDENT'
// Maps to API: NOT_APPLICABLE → '0', NO → '1', YES → '2', NOT_STUDENT → '3'

// VehicleUsage
type VehicleUsage = 'PERSONAL' | 'PROFESSIONAL' | 'TAXI' | 'APP_DRIVER'
// Maps to API: PERSONAL → '0', PROFESSIONAL → '1', TAXI → '2', APP_DRIVER → '3'

// InsuranceType
type InsuranceType = 'NEW' | 'RENEWAL'
// Maps to API: NEW → '0', RENEWAL → '1'

// DriverRelationship
type DriverRelationship = 'SELF' | 'SPOUSE' | 'EMPLOYEE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER' | 'INSURED'
// Maps to API: SELF → '0', SPOUSE → '2', EMPLOYEE → '3', ...

// TrackerType
type TrackerType = 'NONE' | 'AUTOTRAC' | 'CAR_SYSTEM' | ... (18 options)

// AntitheftType
type AntitheftType = 'NONE' | 'ALARM' | 'IGNITION_BLOCKER' | ... (6 options)
```

### Input Types

```ts
interface AutoQuoteInput {
  brokerId: number
  insuranceBroker: string
  insured: InsuredPersonInput
  vehicle: VehicleInput
  questionnaire: QuestionnaireInput
  insurance: InsuranceInput
  mainDriver: MainDriverInput
  coverage?: CoverageInput // optional — Aggilizador picks defaults
}

interface InsuredPersonInput {
  cpf: string // formatted: '529.982.247-25' or raw: '52998224725'
  fullName: string
  birthDate: string // ISO date: '1985-03-15'
  gender: Gender
  maritalStatus: MaritalStatus
  cep: string // formatted: '01310-100' or raw: '01310100'
  email: string
  cellPhone: PhoneInput | null
  homePhone: PhoneInput | null
}

interface PhoneInput {
  areaCode: string // '11'
  number: string // '999998888'
}

interface VehicleInput {
  licensePlate?: string
  model: string // from FIPE search
  manufacturer: string // from FIPE search
  manufactureYear: number
  modelYear: number
  fipeCode: string // '015220-0'
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

interface QuestionnaireInput {
  residenceType: ResidenceType
  residenceGarage: ResidenceGarageType
  workGarage: WorkGarageType
  studyGarage: StudyGarageType
  vehicleUsage: VehicleUsage
  monthlyMileage: number
  isPcd: boolean
  livesWithUnder26: boolean
  profession?: string // key from 715-item list
  workDistance?: string // key from enum
  usagePeriod?: string // key from enum
}

interface InsuranceInput {
  type: InsuranceType
  startDate: string // ISO date
  endDate: string // ISO date
  commission: number // percentage, default 10
  bonus?: string
  previousInsurer?: string
  previousPolicyNumber?: string
  hasClaims?: boolean
  observations?: string
}

interface MainDriverInput {
  cpf: string
  fullName: string
  birthDate: string
  gender: Gender
  maritalStatus: MaritalStatus
  licenseYears?: number // 1-10+
  relationship: DriverRelationship
}
```

### Result Types

```ts
interface QuoteResult {
  id: string // MongoDB ObjectId from Aggilizador
}

interface FipeModel {
  model: string
  manufacturer: string
  fipeCode: string
  vehicleType: number
}

interface EnumOption {
  key: string
  value: string // Portuguese label
}

interface AutoEnums {
  gender: EnumOption[]
  maritalStatus: EnumOption[]
  fuelType: EnumOption[]
  residenceType: EnumOption[]
  residenceGarage: EnumOption[]
  workGarage: EnumOption[]
  studyGarage: EnumOption[]
  vehicleUsage: EnumOption[]
  insuranceType: EnumOption[]
  tracker: EnumOption[]
  antitheft: EnumOption[]
  previousInsurer: EnumOption[]
  bonus: EnumOption[]
  bank: EnumOption[]
  coverageType: EnumOption[]
  franchiseType: EnumOption[]
  roadAssistance: EnumOption[]
  glassProtection: EnumOption[]
  rentalCar: EnumOption[]
  licenseYears: EnumOption[]
  profession: EnumOption[]
  driverRelationship: EnumOption[]
  // ... all 48 enum lists
}
```

---

## Internal Flow

### `submitQuote()` implementation

```
1. Validate input with Zod schemas
2. Map typed enums to API string keys (e.g., Gender.FEMALE → '2')
3. Format phone: { areaCode: '11', number: '999998888' } → { Ddd: '(11)', Numero: '99999-8888' }
4. Format dates: '1985-03-15' → '1985-03-15T03:00:00.000Z' (UTC-3 offset)
5. POST /Auto/Contact → receive { Id }
6. Build consolidated payload with all sections
7. POST /Auto with Id → receive confirmation
8. Return { id }
```

### Error handling

- **`AggilizadorApiError`**: HTTP errors (non-2xx), includes status code and response body
- **`AggilizadorValidationError`**: Zod validation failures on input, includes field-level details
- **`AggilizadorBusinessError`**: When API returns `ErrorMessages` array with content
- All errors extend a base `AggilizadorError` class with a `.code` string property

---

## Design Decisions

1. **Stateless** — No internal state, no session. Each `submitQuote()` call is independent. Safe for concurrent use in workers.

2. **Native fetch** — Uses Node 22 native `fetch` (undici). No external HTTP library dependency.

3. **Zod validation** — Validates all inputs before sending to API. Fails fast with clear error messages rather than getting cryptic API errors.

4. **Enum mapping layer** — Developer-friendly English string unions (`'FEMALE'`, `'FLEX'`) mapped internally to the API's numeric string keys (`'2'`, `'1'`). Raw API keys never leak to consumers.

5. **No `@repo/env` dependency** — `brokerId` and `insuranceBroker` are passed per-call, not env vars. The package has zero coupling to the monorepo's config layer. The consumer decides where credentials come from.

6. **No retry/queue logic** — The package is a thin client. Retry policies, queueing, and scheduling are the responsibility of the consumer (e.g., `apps/worker`).

7. **Extensible for other branches** — The `client.auto.*` namespace pattern allows adding `client.residential.*`, `client.life.*` later. Each branch is a separate service class with its own types.

8. **FIPE client included** — Vehicle model search via `fipe.agger.com.br` is bundled since it's required to get valid `fipeCode` + `model` + `manufacturer` values.

---

## Enum Mapping Reference

Complete mapping from API `/Auto/Data` response. All 48 enum lists captured.

Key enums used in `AutoQuoteInput`:

| Enum                                 | Count | API Keys Sample                                                            |
| ------------------------------------ | ----- | -------------------------------------------------------------------------- |
| Gender (Sexo)                        | 2     | 1=Masculino, 2=Feminino                                                    |
| MaritalStatus (EstadoCivil)          | 5     | 1=Casado, 2=Divorciado, 3=Separado, 4=Solteiro, 5=Viuvo                    |
| FuelType (Combustivel)               | 7     | 1=Flex, 2=Gasolina, 3=Alcool, 4=Diesel, 5=Hibrido, 6=Tetrafuel, 7=Eletrico |
| ResidenceType (TipoResidencia)       | 4     | 1=Casa, 2=Apartamento, 3=Condominio, 4=Outros                              |
| ResidenceGarage (GaragemResidencia)  | 3     | 1=Portao eletronico, 2=Portao manual, 3=Sem garagem                        |
| WorkGarage (GaragemTrabalho)         | 4     | 0=N/A, 1=Nao, 2=Sim, 3=Nao trabalha                                        |
| StudyGarage (GaragemEstudo)          | 4     | 0=N/A, 1=Nao, 2=Sim, 3=Nao estuda                                          |
| VehicleUsage (UsoVeiculo)            | 4     | 0=Particular, 1=Profissional, 2=Taxi, 3=App                                |
| InsuranceType (TipoSeguro)           | 2     | 0=Novo, 1=Renovacao                                                        |
| DriverRelationship                   | 8     | 0=Proprio, 2=Conjuge, 3=Empregado, ...                                     |
| Tracker (Rastreador)                 | 18    | 0=Nenhum, 1=AutoTrac, 2=Car System, ...                                    |
| Antitheft (Antifurto)                | 6     | 0=Nenhum, 1=Alarme, 2=Bloqueador, ...                                      |
| Profession (Profissao)               | 715   | Various                                                                    |
| PreviousInsurer (SeguradoraAnterior) | 54    | 0=Nenhuma, ...                                                             |
| Insurer (Seguradora)                 | 66    | All available insurers                                                     |
| LicenseYears (TempoHabilitacao)      | 11    | 1=1 ano, 2=2 anos, ...                                                     |
| Bank (Banco)                         | 10    | For financed vehicles                                                      |

---

## Scope Boundaries

### In scope

- HTTP client for Aggilizador Auto API
- FIPE model search client
- Zod input validation
- Enum type mapping (English → API keys)
- Error types

### Out of scope (deferred)

- Integration with `packages/core` Proposal module
- BrokerId/InsuranceBroker storage per organization
- Worker/queue job for background submission
- Frontend forms or UI
- Residential, Life, Condominium branches (future extension)
- Retry/circuit breaker policies
- Response caching for `/Auto/Data` enums

---

## Dependencies

- `zod` — Input validation (already in monorepo)
- No other external dependencies. Uses Node 22 native `fetch`.

---

## Monorepo Integration

- Package name: `@repo/aggilizador`
- Add to `packages/aggilizador/package.json`
- Add to root `pnpm-workspace.yaml` (already covers `packages/*`)
- Build with `tsup` (consistent with other packages)
- Add to `noExternal` in any app's tsup config that imports it (per CLAUDE.md rules)
