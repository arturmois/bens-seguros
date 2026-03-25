# Import/Export CSV — Design Spec

> Feature F02 | Effort: G (1-2 weeks) | Priority: Month 2

## Goal

Enable insurance brokers to export filtered data as CSV and bulk-import clients and policies from CSV. Export is synchronous (streaming response). Import is asynchronous (BullMQ) with row-level Zod validation, preview, and progress tracking.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  EXPORT (Phase 1)                                            │
│                                                              │
│  Browser ──GET /api/v1/{entity}/export──▶ Fastify Route      │
│         ◀── text/csv blob ──────────────  (manual CSV gen)   │
│                                                              │
│  Pattern: identical to ExportCommissionsCsv use case         │
│  Max rows: 10,000 per export                                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  IMPORT (Phase 2)                                            │
│                                                              │
│  Browser ──POST /api/v1/{entity}/import──▶ Fastify Route     │
│         ◀── { jobId } ────────────────────  (multipart)      │
│                                                              │
│  1. Parse CSV server-side (papaparse)                        │
│  2. Validate all rows with Zod, collect errors               │
│  3. Enqueue BullMQ job with valid rows + error summary       │
│  4. Worker processes in batches of 50 (Prisma createMany)    │
│  5. Browser polls GET /api/v1/{entity}/import/:jobId/status  │
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌──────────────────┐         │
│  │ Fastify  │───▶│  Redis   │───▶│  apps/worker     │         │
│  │ (parse + │    │ (BullMQ) │    │  csv-import-     │         │
│  │ validate)│    │          │    │  processor.ts    │         │
│  └─────────┘    └─────────┘    └──────────────────┘         │
└──────────────────────────────────────────────────────────────┘
```

### Key Decisions

| Decision          | Choice                                                                     | Rationale                                                                            |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| CSV generation    | Manual (no lib)                                                            | Matches existing `ExportCommissionsCsv` pattern, avoids dependency for simple output |
| CSV parsing       | `papaparse`                                                                | Handles edge cases (quoted fields, BOM, encoding), well-maintained, 0 deps           |
| Import processing | BullMQ (apps/worker)                                                       | Existing worker infra, non-blocking, progress tracking built-in                      |
| Batch size        | 50 records                                                                 | Balance between DB throughput and memory                                             |
| Max import file   | 5 MB / 50,000 rows                                                         | Prevents abuse, sufficient for any broker migration                                  |
| Dedup strategy    | Skip rows with duplicate `document` (clients) or `policyNumber` (policies) | Report as "skipped" in results, do not overwrite                                     |

---

## Phase 1: Exports

### Routes

All follow the existing commission export pattern: use case class with `execute()` returning a CSV string, route sends it as `text/csv` with `Content-Disposition`.

| Route                          | RBAC            | Use Case Class       | File                                                                     |
| ------------------------------ | --------------- | -------------------- | ------------------------------------------------------------------------ |
| `GET /api/v1/clients/export`   | `read:Client`   | `ExportClientsCsv`   | `packages/core/src/modules/client/application/export-clients-csv.ts`     |
| `GET /api/v1/policies/export`  | `read:Policy`   | `ExportPoliciesCsv`  | `packages/core/src/modules/policy/application/export-policies-csv.ts`    |
| `GET /api/v1/proposals/export` | `read:Proposal` | `ExportProposalsCsv` | `packages/core/src/modules/proposal/application/export-proposals-csv.ts` |

### Use Case Structure (all identical pattern)

```typescript
// Same pattern as ExportCommissionsCsv
@injectable()
export class ExportClientsCsv {
  constructor(
    @inject('ClientRepository')
    private readonly clientRepo: ClientRepository
  ) {}

  async execute(filters: ClientFilters): Promise<string> {
    const { items } = await this.clientRepo.findMany(filters, {
      limit: MAX_EXPORT_ROWS, // 10_000
    })
    const header = CLIENT_CSV_COLUMNS.join(',') + '\n'
    const rows = items.map((c) => formatClientRow(c)).join('\n')
    return header + rows
  }
}
```

Each use case lives in `packages/core` and uses `escapeCsvField()` (extract from commission module into a shared `packages/core/src/shared/csv-utils.ts`).

### Route Registration

Export routes MUST be registered before `/:id` routes to avoid Fastify treating "export" as an ID parameter (same pattern as commission routes).

### Frontend Components

One reusable component per entity toolbar, following `CommissionExportButton` pattern:

| Component              | Location                                                                |
| ---------------------- | ----------------------------------------------------------------------- |
| `ClientExportButton`   | `apps/web/src/features/clients/components/client-export-button.tsx`     |
| `PolicyExportButton`   | `apps/web/src/features/policies/components/policy-export-button.tsx`    |
| `ProposalExportButton` | `apps/web/src/features/proposals/components/proposal-export-button.tsx` |

Each uses a `useExport{Entity}Csv` mutation hook that fetches the blob and triggers download (identical to `useExportCommissionsCsv`).

### Shared Utilities

Extract from commission code into reusable helpers:

```
packages/core/src/shared/csv-utils.ts
  - escapeCsvField(value: string): string
  - formatCsvRow(fields: string[]): string
  - MAX_EXPORT_ROWS = 10_000

apps/web/src/lib/csv-download.ts
  - downloadCsvBlob(url: string, filename: string): Promise<void>
```

---

## Phase 2: Imports

### Routes

| Route                                       | Method    | RBAC                     | Purpose                                          |
| ------------------------------------------- | --------- | ------------------------ | ------------------------------------------------ |
| `POST /api/v1/clients/import`               | multipart | `create:Client` (ADMIN+) | Upload CSV, validate, enqueue job                |
| `GET /api/v1/clients/import/template`       | GET       | `read:Client`            | Download template CSV with headers + example row |
| `GET /api/v1/clients/import/:jobId/status`  | GET       | `create:Client`          | Poll job progress                                |
| `POST /api/v1/policies/import`              | multipart | `create:Policy` (ADMIN+) | Upload CSV, validate, enqueue job                |
| `GET /api/v1/policies/import/template`      | GET       | `read:Policy`            | Download template CSV                            |
| `GET /api/v1/policies/import/:jobId/status` | GET       | `create:Policy`          | Poll job progress                                |

### Import Flow (Server)

```
1. Receive multipart file (fastify-multipart)
2. Validate: file size <= 5MB, extension .csv
3. Parse with papaparse (header: true, skipEmptyLines: true)
4. Validate each row against Zod schema
5. Response: { success: true, data: { jobId, preview, validationSummary } }
   - preview: first 5 parsed rows
   - validationSummary: { total, valid, invalid, errors: [{ row, field, message }] }
6. Client reviews preview + errors, confirms import
7. POST /api/v1/{entity}/import/:jobId/confirm
8. Worker picks up job, processes batches of 50
```

### Import Use Cases

```
packages/core/src/modules/client/application/
  parse-client-import.ts     — Parse + validate CSV, return preview + jobId
  confirm-client-import.ts   — Enqueue BullMQ job for confirmed import

packages/core/src/modules/policy/application/
  parse-policy-import.ts
  confirm-policy-import.ts
```

### BullMQ Worker

New processor in `apps/worker/src/processors/csv-import-processor.ts`:

```typescript
// Job data shape
interface CsvImportJobData {
  entityType: 'client' | 'policy'
  organizationId: string
  userId: string
  rows: Record<string, unknown>[] // validated rows
  totalRows: number
}

// Job progress updates
interface CsvImportProgress {
  processed: number
  created: number
  skipped: number
  failed: number
  total: number
  errors: Array<{ row: number; message: string }>
}
```

Processing logic:

- Chunk rows into batches of 50
- Use `prisma.client.createMany({ skipDuplicates: true })` for clients
- For policies: validate that `clientId` or client `document` exists, link to client
- Update job progress after each batch (`job.updateProgress()`)
- On completion: store final result in job data

Queue name: `csv-import`

### Import Status Polling

`GET /api/v1/{entity}/import/:jobId/status` returns:

```json
{
  "success": true,
  "data": {
    "status": "active" | "completed" | "failed" | "waiting",
    "progress": {
      "processed": 150,
      "created": 142,
      "skipped": 5,
      "failed": 3,
      "total": 200,
      "errors": [
        { "row": 23, "message": "CPF inválido: 123" },
        { "row": 45, "message": "Email inválido: foo" }
      ]
    }
  }
}
```

### Frontend: Import Dialog

Shared `ImportDialog` component (~180 lines, split into sub-components):

```
apps/web/src/components/import-dialog/
  import-dialog.tsx          — Shell: steps, state machine
  upload-step.tsx            — Drag-and-drop zone + template download link
  preview-step.tsx           — Table with first 5 rows + validation errors
  progress-step.tsx          — Progress bar + live counts
  results-step.tsx           — Final summary (created/skipped/errors)
  types.ts                   — Shared types
```

State machine (4 steps):

```
UPLOAD → PREVIEW → PROCESSING → RESULTS
                ↑               │
                └── (retry) ────┘
```

Props:

```typescript
interface ImportDialogProps {
  readonly entityType: 'client' | 'policy'
  readonly endpoint: string // e.g., '/api/v1/clients/import'
  readonly templateEndpoint: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onComplete: () => void // refresh table data
}
```

Each entity page renders `ImportDialog` with its own endpoint. The dialog is generic.

### Template Download

Each entity gets a `GET /api/v1/{entity}/import/template` route that returns a CSV with:

- Header row (Portuguese labels)
- One example row with valid data
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="template-clientes.csv"`

---

## CSV Schema per Entity

### Client Export

| CSV Column         | Field         | Format                                                 |
| ------------------ | ------------- | ------------------------------------------------------ |
| ID                 | id            | cuid                                                   |
| Nome               | name          | string                                                 |
| CPF/CNPJ           | document      | string                                                 |
| Tipo               | type          | LEAD / CLIENT / FORMER_CLIENT                          |
| Email              | email         | string or empty                                        |
| Telefone           | phone         | string or empty                                        |
| Data Nascimento    | birthDate     | YYYY-MM-DD or empty                                    |
| Profissao          | profession    | string or empty                                        |
| Estado Civil       | maritalStatus | SINGLE / MARRIED / DIVORCED / WIDOWED / OTHER or empty |
| Tags               | tags          | semicolon-separated                                    |
| Consentimento LGPD | consentLgpd   | Sim / Nao                                              |
| Criado em          | createdAt     | ISO 8601                                               |

### Client Import

| CSV Column      | Required | Zod Validation                                                  |
| --------------- | -------- | --------------------------------------------------------------- |
| Nome            | yes      | `z.string().min(2).max(200)`                                    |
| CPF/CNPJ        | yes      | `z.string().min(11).max(18)` (validated with cpf/cnpj check)    |
| Tipo            | no       | `z.enum(['LEAD','CLIENT','FORMER_CLIENT']).default('CLIENT')`   |
| Email           | no       | `z.string().email().optional()`                                 |
| Telefone        | no       | `z.string().optional()`                                         |
| Data Nascimento | no       | `z.string().pipe(z.coerce.date()).optional()`                   |
| Profissao       | no       | `z.string().max(100).optional()`                                |
| Estado Civil    | no       | `z.enum([...]).optional()`                                      |
| Tags            | no       | `z.string().optional()` (semicolon-separated, split into array) |

Dedup: rows with a `document` already existing for the tenant are marked "skipped".

### Policy Export

| CSV Column       | Field               | Format                       |
| ---------------- | ------------------- | ---------------------------- |
| ID               | id                  | cuid                         |
| Numero Apolice   | policyNumber        | string                       |
| Cliente          | client.name         | string                       |
| CPF/CNPJ Cliente | client.document     | string                       |
| Vendedor         | salesperson.name    | string                       |
| Seguradora       | insurer.name        | string or empty              |
| Ramo             | branch              | AUTO / RESIDENTIAL / ...     |
| Status           | status              | ACTIVE / CANCELLED / EXPIRED |
| Premio (R$)      | premiumValueInCents | decimal (cents / 100)        |
| Inicio Vigencia  | startDate           | YYYY-MM-DD                   |
| Fim Vigencia     | endDate             | YYYY-MM-DD                   |
| Criado em        | createdAt           | ISO 8601                     |

### Policy Import

| CSV Column       | Required | Zod Validation                                                           |
| ---------------- | -------- | ------------------------------------------------------------------------ |
| Numero Apolice   | yes      | `z.string().min(1)`                                                      |
| CPF/CNPJ Cliente | yes      | `z.string().min(11)` (must match existing client)                        |
| Ramo             | yes      | `z.enum(['AUTO','RESIDENTIAL','CONDOMINIUM','BUSINESS','LIFE','OTHER'])` |
| Premio (R$)      | yes      | `z.string().pipe(z.coerce.number().positive())` (converted to cents)     |
| Inicio Vigencia  | yes      | `z.string().pipe(z.coerce.date())`                                       |
| Fim Vigencia     | yes      | `z.string().pipe(z.coerce.date())`                                       |
| Seguradora       | no       | `z.string().optional()` (matched by name against existing insurers)      |
| Status           | no       | `z.enum(['ACTIVE','CANCELLED','EXPIRED']).default('ACTIVE')`             |

Policy import requires `salespersonId` to be set — use the importing user's ID as default. Client is resolved by `document` match.

Dedup: rows with a `policyNumber` already existing for the tenant are marked "skipped".

### Proposal Export

| CSV Column       | Field                       | Format                       |
| ---------------- | --------------------------- | ---------------------------- |
| ID               | id                          | cuid                         |
| Cliente          | client.name                 | string                       |
| CPF/CNPJ Cliente | client.document             | string                       |
| Vendedor         | salesperson.name            | string                       |
| Estagio          | stage                       | CAPTURE / QUOTE / ...        |
| Tipo             | boardType                   | NEW_INSURANCE / RENEWAL      |
| Ramo             | branch                      | AUTO / ...                   |
| Premio (R$)      | premiumValueInCents         | decimal                      |
| Comissao (%)     | commissionPercentageInCents | decimal (basis points / 100) |
| Seguradora       | insurer.name                | string or empty              |
| Criado em        | createdAt                   | ISO 8601                     |

Proposals are export-only (no import) since they follow a state machine workflow.

---

## Error Handling

### Export Errors

| Scenario                 | HTTP Status | Error Code                             |
| ------------------------ | ----------- | -------------------------------------- |
| No records match filters | 200         | Return CSV with headers only (no rows) |
| Unauthorized             | 403         | `FORBIDDEN`                            |
| Server error             | 500         | `EXPORT_FAILED`                        |

### Import Errors

| Scenario                       | HTTP Status | Error Code                              |
| ------------------------------ | ----------- | --------------------------------------- |
| File too large (>5MB)          | 413         | `FILE_TOO_LARGE`                        |
| Invalid file format            | 422         | `INVALID_FILE_FORMAT`                   |
| No valid rows after validation | 422         | `NO_VALID_ROWS`                         |
| All rows are duplicates        | 200         | Completed with `created: 0, skipped: N` |
| Job not found                  | 404         | `IMPORT_JOB_NOT_FOUND`                  |
| Unauthorized                   | 403         | `FORBIDDEN`                             |

### Row-Level Errors

Each invalid row produces a structured error in the validation summary:

```json
{
  "row": 15,
  "field": "document",
  "message": "CPF/CNPJ inválido",
  "value": "123"
}
```

Errors are capped at 100 per import to avoid oversized responses. If more than 50% of rows are invalid, the import is rejected upfront with `TOO_MANY_ERRORS`.

---

## File Structure (new files)

```
packages/core/src/shared/csv-utils.ts                              — shared escape/format helpers

packages/core/src/modules/client/application/
  export-clients-csv.ts                                             — use case
  parse-client-import.ts                                            — parse + validate
  confirm-client-import.ts                                          — enqueue job

packages/core/src/modules/policy/application/
  export-policies-csv.ts
  parse-policy-import.ts
  confirm-policy-import.ts

packages/core/src/modules/proposal/application/
  export-proposals-csv.ts

apps/server/src/schemas/import.schemas.ts                          — shared import Zod schemas
apps/worker/src/processors/csv-import-processor.ts                 — BullMQ processor

apps/web/src/components/import-dialog/
  import-dialog.tsx
  upload-step.tsx
  preview-step.tsx
  progress-step.tsx
  results-step.tsx
  types.ts

apps/web/src/lib/csv-download.ts                                   — shared blob download helper

apps/web/src/features/clients/components/client-export-button.tsx
apps/web/src/features/clients/components/client-import-button.tsx
apps/web/src/features/policies/components/policy-export-button.tsx
apps/web/src/features/policies/components/policy-import-button.tsx
apps/web/src/features/proposals/components/proposal-export-button.tsx
```

---

## Acceptance Criteria

### Phase 1 (Exports)

- [ ] `GET /api/v1/clients/export` returns valid CSV with all client fields
- [ ] `GET /api/v1/policies/export` returns valid CSV with all policy fields (includes related client/insurer names)
- [ ] `GET /api/v1/proposals/export` returns valid CSV with all proposal fields
- [ ] All export routes respect current filters (search, status, date range)
- [ ] All exports enforce `organizationId` — no cross-tenant data leakage
- [ ] Export buttons appear in each entity's toolbar
- [ ] Loading spinner shows during export download
- [ ] Toast notification on success/error
- [ ] Empty filter returns all records (up to 10,000)
- [ ] CSV handles special characters (commas, quotes, newlines in fields)

### Phase 2 (Imports)

- [ ] `POST /api/v1/clients/import` accepts multipart CSV upload
- [ ] `POST /api/v1/policies/import` accepts multipart CSV upload
- [ ] Server parses CSV with papaparse and validates each row with Zod
- [ ] Response includes preview of first 5 rows
- [ ] Response includes validation summary with row-level errors
- [ ] Confirmation step before processing (separate endpoint)
- [ ] BullMQ job processes in batches of 50
- [ ] Progress polling endpoint returns live progress
- [ ] Import dialog shows 4 steps: Upload, Preview, Processing, Results
- [ ] Template CSV available for download with headers + example row
- [ ] Duplicate detection by `document` (clients) / `policyNumber` (policies) — reported as "skipped"
- [ ] More than 50% invalid rows rejects the entire import
- [ ] Max 100 errors returned per import
- [ ] RBAC: only ADMIN+ can import; anyone with read can export
- [ ] All imported records tagged with `organizationId` of the importing user
- [ ] Import file size limited to 5MB
