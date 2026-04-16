# @repo/aggilizador

TypeScript client for the Aggilizador (Agger/Lojacorr) REST API. Submits insurance quotes programmatically without the web form.

## API

**Base URL:** `https://api.aggilizador.com.br`
**FIPE URL:** `https://fipe.agger.com.br`
**Auth:** None — identified by `BrokerId` (number) + `InsuranceBroker` (string) per request.

### Submit flow (2 requests)

1. `POST /Auto/Contact` → creates quote record, returns `{ Id, ErrorMessages }`
2. `POST /Auto` → sends all data consolidated with the `Id`, returns confirmation

### Other endpoints

| Endpoint                                   | Purpose                             |
| ------------------------------------------ | ----------------------------------- |
| `GET /Auto/Data`                           | 48 enum lists (dropdown options)    |
| `POST fipe.agger.com.br/api/auth`          | FIPE auth (base64 token → JWT)      |
| `GET fipe.agger.com.br/v1/fipe/modeloeano` | Vehicle model search by name + year |

## Usage

```ts
import { AggilizadorClient } from '@repo/aggilizador'

const client = new AggilizadorClient() // default URLs
// or: new AggilizadorClient({ baseUrl: '...', fipeBaseUrl: '...' })

// Submit auto quote
const result = await client.auto.submitQuote({
  brokerId: 1366,
  insuranceBroker: 'lojacorr',
  insured: { cpf, fullName, birthDate, gender, maritalStatus, cep, email, cellPhone, homePhone },
  vehicle: { model, manufacturer, manufactureYear, modelYear, fipeCode, fuelType, overnightCep, ... },
  questionnaire: { residenceType, residenceGarage, workGarage, vehicleUsage, monthlyMileage, ... },
  insurance: { type, startDate, endDate, commission },
  mainDriver: { cpf, fullName, birthDate, gender, maritalStatus, relationship },
})
// result: { id: '...' }

// Search FIPE models
const models = await client.fipe.searchModels({ model: 'HB20', year: 2023 })

// Get enum options (for frontend dropdowns)
const enums = await client.auto.getEnums()
```

## Architecture

```
src/
├── client.ts                   # AggilizadorClient — main entry, configurable URLs
├── branches/auto.ts            # AutoQuoteService — submitQuote(), getEnums()
├── builders/
│   ├── auto-payload-builder.ts # Typed inputs → API JSON (isolated from consumers)
│   └── formatters.ts           # Date, phone, boolean formatting helpers
├── mappings/
│   ├── enum-registry.ts        # Dynamic enum fetch + in-memory cache + fallback
│   ├── auto-enum-defaults.ts   # Hardcoded fallback (SINGLE FILE to update if API changes)
│   └── label-mappings.ts       # English key → Portuguese label for dynamic resolution
├── fipe/fipe-client.ts         # FIPE model search with JWT auth caching
├── types/
│   ├── enums.ts                # 14 typed string unions (Gender, FuelType, TrackerType, ...)
│   ├── common.ts               # PhoneInput, InsuredPersonInput, ClientConfig, QuoteResult
│   ├── auto.ts                 # VehicleInput, QuestionnaireInput, AutoQuoteInput, FipeModel, ...
│   └── api.ts                  # Raw API shapes (internal, never exported to consumers)
├── schemas.ts                  # Zod validation (autoQuoteInputSchema)
├── errors.ts                   # AggilizadorError hierarchy (Api, Validation, Business)
├── http.ts                     # Native fetch wrapper
└── index.ts                    # Public exports barrel
```

## Enum system

Enums use a **dynamic-first, fallback-to-hardcoded** strategy:

1. On first use, fetches `GET /Auto/Data` (48 enum lists from API)
2. Caches in memory (per-client instance, process lifetime)
3. Matches our English keys to API keys via Portuguese label lookup
4. Falls back to `auto-enum-defaults.ts` if API is unreachable
5. `registry.invalidate()` clears cache for manual refresh

**If Lojacorr changes enum keys:** auto-resolved via label matching, no deploy needed.
**If they change labels AND keys:** update `auto-enum-defaults.ts` (one file).

## Maintenance

| What changed                             | Where to fix                                       |
| ---------------------------------------- | -------------------------------------------------- |
| Enum keys/values                         | Auto-resolved (dynamic fetch)                      |
| API payload fields                       | `builders/auto-payload-builder.ts`                 |
| API base URL                             | Consumer passes new URL to constructor             |
| FIPE API format                          | `fipe/fipe-client.ts`                              |
| New insurance branch (Residential, Life) | New files in `branches/`, `builders/`, `mappings/` |

## Design constraints

- **Stateless** — no session, each call is independent. Safe for concurrent workers.
- **No `@repo/env`** — `brokerId`/`insuranceBroker` passed per call (multi-tenant SaaS).
- **No retry/queue** — consumer's responsibility (e.g., `apps/worker`).
- **Native fetch** — Node 22, no HTTP library dependency.
- **Zod validation** — inputs validated before API calls.

## Testing

```bash
pnpm --filter @repo/aggilizador test        # 15 tests across 4 spec files
pnpm --filter @repo/aggilizador test:watch  # watch mode
```

Tests mock `globalThis.fetch` — no real API calls in CI.

## Adding to an app

When importing `@repo/aggilizador` from an app that uses tsup (server, worker, chat-server, chat-worker), add it to `noExternal` in that app's tsup config per CLAUDE.md rules.
