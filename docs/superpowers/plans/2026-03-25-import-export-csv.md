# Import/Export CSV — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable insurance brokers to export filtered data as CSV and bulk-import clients and policies from CSV. Export is synchronous (streaming response). Import is asynchronous (BullMQ) with row-level Zod validation, preview, and progress tracking.
**Architecture:** Export follows `ExportCommissionsCsv` pattern (manual CSV, no library). Import uses papaparse for parsing, Zod per row, BullMQ for async processing.
**Tech Stack:** Fastify 5, tsyringe DI, Zod, BullMQ 5, papaparse, React 19 + TanStack Query
**Spec:** `docs/superpowers/specs/2026-03-25-import-export-csv-design.md`

---

## Phase 1: Exports (~4 tasks)

### Task 1 — Extract shared CSV utilities and create client export use case

- [ ] **1.1** Create `packages/core/src/shared/csv-utils.ts` — extract `escapeCsvField` from `packages/core/src/modules/commission/application/export-commissions-csv.ts` and add `formatCsvRow` + `MAX_EXPORT_ROWS` constant:

```typescript
// packages/core/src/shared/csv-utils.ts
export const MAX_EXPORT_ROWS = 10_000

export function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function formatCsvRow(fields: string[]): string {
  return fields.map((f) => escapeCsvField(f)).join(',')
}
```

- [ ] **1.2** Refactor `packages/core/src/modules/commission/application/export-commissions-csv.ts` to import from shared csv-utils instead of inline `escapeCsvField`. Remove the local copy and `MAX_EXPORT_ROWS`, import both from `../../shared/csv-utils.js`.

- [ ] **1.3** Create `packages/core/src/modules/client/application/export-clients-csv.ts`:

```typescript
// packages/core/src/modules/client/application/export-clients-csv.ts
import { injectable, inject } from 'tsyringe'
import type {
  ClientRepository,
  ClientFilters,
} from '../domain/client-repository.js'
import { MAX_EXPORT_ROWS, formatCsvRow } from '../../shared/csv-utils.js'

const CLIENT_CSV_COLUMNS = [
  'ID',
  'Nome',
  'CPF/CNPJ',
  'Tipo',
  'Email',
  'Telefone',
  'Data Nascimento',
  'Profissao',
  'Estado Civil',
  'Tags',
  'Consentimento LGPD',
  'Criado em',
]

@injectable()
export class ExportClientsCsv {
  constructor(
    @inject('ClientRepository')
    private readonly clientRepo: ClientRepository
  ) {}

  async execute(filters: ClientFilters): Promise<string> {
    const { items } = await this.clientRepo.findMany(filters, {
      limit: MAX_EXPORT_ROWS,
    })

    const header = CLIENT_CSV_COLUMNS.join(',') + '\n'
    const rows = items
      .map((c) =>
        formatCsvRow([
          c.id,
          c.name,
          c.document,
          c.type,
          c.email ?? '',
          c.phone ?? '',
          c.birthDate ? c.birthDate.toISOString().split('T')[0] : '',
          c.profession ?? '',
          c.maritalStatus ?? '',
          c.tags.join(';'),
          c.consentLgpd ? 'Sim' : 'Nao',
          c.createdAt.toISOString(),
        ])
      )
      .join('\n')

    return header + rows
  }
}
```

- [ ] **1.4** Export `ExportClientsCsv` from `packages/core/src/modules/client/index.ts` — add line: `export { ExportClientsCsv } from './application/export-clients-csv.js'`

- [ ] **1.5** Export shared csv-utils from `packages/core/src/index.ts` — add: `export { escapeCsvField, formatCsvRow, MAX_EXPORT_ROWS } from './shared/csv-utils.js'`

- [ ] **1.6** Register `ExportClientsCsv` in `apps/server/src/container-registrations.ts`:
  - Add `ExportClientsCsv` to the import from `@repo/core`
  - Add registration: `container.register(ExportClientsCsv, { useFactory: () => new ExportClientsCsv(clientRepo) })`

- [ ] **1.7** Add export route in `apps/server/src/routes/v1/client-routes.ts`:
  - Import `ExportClientsCsv` from `@repo/core` and `listClientsQuerySchema` (already imported)
  - Add the route **BEFORE** the `GET /api/v1/clients` route (to avoid `/:id` conflict):

```typescript
// IMPORTANT: export route must be registered BEFORE /:id
app.get(
  '/api/v1/clients/export',
  { preHandler: [requireAbility('read', 'Client')] },
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { type, search } = listClientsQuerySchema.parse(request.query)
    const useCase = container.resolve(ExportClientsCsv)
    const csv = await useCase.execute({
      organizationId: request.organizationId!,
      type,
      search,
    })
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="clientes.csv"')
      .send(csv)
  }
)
```

- [ ] **1.8** Verify: `pnpm typecheck` passes

- [ ] **1.9** Commit: `feat(csv): add shared csv-utils and client export use case + route`

---

### Task 2 — Policy and proposal export use cases + routes

- [ ] **2.1** Create `packages/core/src/modules/policy/application/export-policies-csv.ts`:

```typescript
import { injectable, inject } from 'tsyringe'
import type {
  PolicyRepository,
  PolicyFilters,
} from '../domain/policy-repository.js'
import { MAX_EXPORT_ROWS, formatCsvRow } from '../../shared/csv-utils.js'

const POLICY_CSV_COLUMNS = [
  'ID',
  'Numero Apolice',
  'Cliente',
  'CPF/CNPJ Cliente',
  'Vendedor',
  'Seguradora',
  'Ramo',
  'Status',
  'Premio (R$)',
  'Inicio Vigencia',
  'Fim Vigencia',
  'Criado em',
]

@injectable()
export class ExportPoliciesCsv {
  constructor(
    @inject('PolicyRepository')
    private readonly policyRepo: PolicyRepository
  ) {}

  async execute(filters: PolicyFilters): Promise<string> {
    const { items } = await this.policyRepo.findMany(filters, {
      limit: MAX_EXPORT_ROWS,
    })

    const header = POLICY_CSV_COLUMNS.join(',') + '\n'
    const rows = items
      .map((p) =>
        formatCsvRow([
          p.id,
          p.policyNumber,
          p.clientName ?? p.clientId,
          p.clientDocument ?? '',
          p.salespersonName ?? p.salespersonId,
          p.insurerName ?? '',
          p.branch,
          p.status,
          (p.premiumValueInCents / 100).toFixed(2),
          p.startDate.toISOString().split('T')[0],
          p.endDate.toISOString().split('T')[0],
          p.createdAt.toISOString(),
        ])
      )
      .join('\n')

    return header + rows
  }
}
```

**NOTE:** The `PolicyData` interface needs `clientDocument` and `insurerName` optional fields. Add them to `packages/core/src/modules/policy/domain/policy-repository.ts`:

```typescript
clientDocument?: string
insurerName?: string
```

Also update `PrismaPolicyRepository.findMany` to include `client`, `insurer` relations and map `clientDocument: row.client.document`, `insurerName: row.insurer?.name` (follow the existing `clientName`/`salespersonName` pattern).

- [ ] **2.2** Create `packages/core/src/modules/proposal/application/export-proposals-csv.ts`:

```typescript
import { injectable, inject } from 'tsyringe'
import type {
  ProposalRepository,
  ProposalFilters,
} from '../domain/proposal-repository.js'
import { MAX_EXPORT_ROWS, formatCsvRow } from '../../shared/csv-utils.js'

const PROPOSAL_CSV_COLUMNS = [
  'ID',
  'Cliente',
  'CPF/CNPJ Cliente',
  'Vendedor',
  'Estagio',
  'Tipo',
  'Ramo',
  'Premio (R$)',
  'Comissao (%)',
  'Seguradora',
  'Criado em',
]

@injectable()
export class ExportProposalsCsv {
  constructor(
    @inject('ProposalRepository')
    private readonly proposalRepo: ProposalRepository
  ) {}

  async execute(filters: ProposalFilters): Promise<string> {
    const { items } = await this.proposalRepo.findMany(filters, {
      limit: MAX_EXPORT_ROWS,
    })

    const header = PROPOSAL_CSV_COLUMNS.join(',') + '\n'
    const rows = items
      .map((p) =>
        formatCsvRow([
          p.id,
          p.clientName ?? p.clientId,
          p.clientDocument ?? '',
          p.salespersonName ?? p.salespersonId,
          p.stage,
          p.boardType,
          p.branch,
          (p.premiumValueInCents / 100).toFixed(2),
          (p.commissionPercentageInCents / 100).toFixed(2),
          p.insurerName ?? '',
          p.createdAt.toISOString(),
        ])
      )
      .join('\n')

    return header + rows
  }
}
```

**NOTE:** The `Proposal` entity (and its `ProposalProps`) needs `clientDocument` and `insurerName` optional fields. Add them to `ProposalProps` in `packages/core/src/modules/proposal/domain/proposal.ts`:

```typescript
clientDocument?: string
insurerName?: string
```

Also add public getters in the `Proposal` class. Update `PrismaProposalRepository.findMany` to include the `client` and `insurer` relations and map `clientDocument: row.client.document`, `insurerName: row.insurer?.name`.

- [ ] **2.3** Export both use cases from their module index files:
  - `packages/core/src/modules/policy/index.ts`: add `export { ExportPoliciesCsv } from './application/export-policies-csv.js'`
  - `packages/core/src/modules/proposal/index.ts`: add `export { ExportProposalsCsv } from './application/export-proposals-csv.js'`

- [ ] **2.4** Register both in `apps/server/src/container-registrations.ts`:
  - Import `ExportPoliciesCsv` and `ExportProposalsCsv` from `@repo/core`
  - `container.register(ExportPoliciesCsv, { useFactory: () => new ExportPoliciesCsv(policyRepo) })`
  - `container.register(ExportProposalsCsv, { useFactory: () => new ExportProposalsCsv(proposalRepo) })`

- [ ] **2.5** Add export route in `apps/server/src/routes/v1/policy-routes.ts` — **BEFORE** the `GET /api/v1/policies` route:

```typescript
app.get(
  '/api/v1/policies/export',
  { preHandler: [requireAbility('read', 'Policy')] },
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { status, clientId, proposalId, branch, search } =
      listPoliciesQuerySchema.parse(request.query)
    const useCase = container.resolve(ExportPoliciesCsv)
    const csv = await useCase.execute({
      organizationId: request.organizationId!,
      status,
      clientId,
      proposalId,
      branch,
      search,
    })
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="apolices.csv"')
      .send(csv)
  }
)
```

- [ ] **2.6** Add export route in `apps/server/src/routes/v1/proposal-routes.ts` — **BEFORE** the `GET /api/v1/proposals` route:

```typescript
app.get(
  '/api/v1/proposals/export',
  { preHandler: [requireAbility('read', 'Proposal')] },
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { stage, clientId, boardType, search } =
      listProposalsQuerySchema.parse(request.query)
    const useCase = container.resolve(ExportProposalsCsv)
    const csv = await useCase.execute({
      organizationId: request.organizationId!,
      stage,
      clientId,
      boardType,
      search,
    })
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename="propostas.csv"')
      .send(csv)
  }
)
```

- [ ] **2.7** Verify: `pnpm typecheck` passes

- [ ] **2.8** Commit: `feat(csv): add policy and proposal export use cases + routes`

---

### Task 3 — Frontend: shared CSV download helper and export buttons

- [ ] **3.1** Create `apps/web/src/lib/csv-download.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function downloadCsvBlob(
  path: string,
  filename: string
): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Falha ao exportar CSV')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **3.2** Create `apps/web/src/features/clients/components/client-export-button.tsx` — follows `CommissionExportButton` pattern:

```typescript
'use client'

import { Download, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { downloadCsvBlob } from '@/lib/csv-download'

import type { ClientFilters } from '../types'

interface ClientExportButtonProps {
  readonly filters: ClientFilters
}

export function ClientExportButton({ filters }: ClientExportButtonProps) {
  const exportCsv = useMutation({
    mutationFn: async (f: ClientFilters) => {
      const params = new URLSearchParams()
      if (f.search) params.set('search', f.search)
      if (f.type) params.set('type', f.type)
      await downloadCsvBlob(
        `/api/v1/clients/export?${params.toString()}`,
        'clientes.csv'
      )
    },
    onSuccess: () => toast.success('Exportacao concluida'),
    onError: () => toast.error('Erro ao exportar clientes'),
  })

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportCsv.mutate(filters)}
      disabled={exportCsv.isPending}
      aria-label="Exportar clientes em CSV"
    >
      {exportCsv.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Exportar CSV
    </Button>
  )
}
```

- [ ] **3.3** Create `apps/web/src/features/policies/components/policy-export-button.tsx` — same pattern, using policy filter params (`status`, `clientId`, `proposalId`, `branch`, `search`), filename `apolices.csv`, endpoint `/api/v1/policies/export`.

- [ ] **3.4** Create `apps/web/src/features/proposals/components/proposal-export-button.tsx` — same pattern, using proposal filter params (`stage`, `clientId`, `boardType`, `search`), filename `propostas.csv`, endpoint `/api/v1/proposals/export`.

- [ ] **3.5** Integrate `ClientExportButton` into `apps/web/src/features/clients/components/clients-toolbar.tsx`:
  - Add `currentFilters: ClientFilters` prop to `ClientsToolbarProps`
  - Import and render `<ClientExportButton filters={currentFilters} />` next to the "Novo Cliente" button

- [ ] **3.6** Integrate `PolicyExportButton` into the policies listing page. Find the policies page/table component that renders the toolbar area (likely `apps/web/src/features/policies/components/policies-table.tsx`) and add the button to the toolbar section.

- [ ] **3.7** Integrate `ProposalExportButton` into the proposals listing page. Find the proposals page component with the table/kanban toolbar area and add the button.

- [ ] **3.8** Refactor `apps/web/src/features/commissions/hooks/use-commissions.ts` `useExportCommissionsCsv` to use the shared `downloadCsvBlob` helper instead of inline fetch/blob logic. Keep the same behavior.

- [ ] **3.9** Verify: `pnpm typecheck` and `pnpm lint` pass

- [ ] **3.10** Commit: `feat(csv): add frontend export buttons for clients, policies, proposals`

---

### Task 4 — Phase 1 QA verification

- [ ] **4.1** Verify each export endpoint works via browser or curl:
  - `GET /api/v1/clients/export` returns valid CSV with headers + data rows
  - `GET /api/v1/policies/export` returns valid CSV with related client/insurer names
  - `GET /api/v1/proposals/export` returns valid CSV with related names
  - Each enforces `organizationId` (no cross-tenant leakage)
  - Filters work (search, status, type, etc.)
  - Special characters (commas, quotes) are properly escaped
  - Empty result returns CSV with headers only (no error)

- [ ] **4.2** Verify frontend buttons:
  - Export button shows in clients toolbar with loading spinner
  - Export button shows in policies listing
  - Export button shows in proposals listing
  - Downloads trigger with correct filename
  - Toast shows success/error

- [ ] **4.3** Run quality gates: `pnpm lint && pnpm typecheck && pnpm build`

- [ ] **4.4** Commit (if any fixes): `fix(csv): address Phase 1 QA findings`

---

## Phase 2: Imports (~5 tasks)

### Task 5 — Install papaparse and create import Zod schemas

- [ ] **5.1** Install papaparse in the core package:

```bash
cd packages/core && pnpm add papaparse && pnpm add -D @types/papaparse
```

- [ ] **5.2** Create `packages/core/src/shared/csv-import-types.ts` — shared types for import processing:

```typescript
export interface CsvRowError {
  readonly row: number
  readonly field: string
  readonly message: string
  readonly value?: string
}

export interface CsvValidationSummary {
  readonly total: number
  readonly valid: number
  readonly invalid: number
  readonly errors: readonly CsvRowError[]
}

export interface CsvImportParseResult {
  readonly jobId: string
  readonly preview: ReadonlyArray<Record<string, string>>
  readonly validationSummary: CsvValidationSummary
  readonly validRows: ReadonlyArray<Record<string, unknown>>
}

export interface CsvImportJobData {
  readonly entityType: 'client' | 'policy'
  readonly organizationId: string
  readonly userId: string
  readonly rows: ReadonlyArray<Record<string, unknown>>
  readonly totalRows: number
}

export interface CsvImportProgress {
  processed: number
  created: number
  skipped: number
  failed: number
  total: number
  errors: Array<{ row: number; message: string }>
}

export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
export const MAX_IMPORT_ROWS = 50_000
export const IMPORT_BATCH_SIZE = 50
export const MAX_IMPORT_ERRORS = 100
```

- [ ] **5.3** Create `packages/core/src/modules/client/application/client-import-schema.ts` — Zod schema for client CSV row validation:

```typescript
import { z } from 'zod'

export const clientImportRowSchema = z.object({
  Nome: z.string().min(2).max(200),
  'CPF/CNPJ': z.string().min(11).max(18),
  Tipo: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']).default('CLIENT'),
  Email: z.string().email().optional().or(z.literal('')),
  Telefone: z.string().optional().or(z.literal('')),
  'Data Nascimento': z
    .string()
    .pipe(z.coerce.date())
    .optional()
    .or(z.literal('')),
  Profissao: z.string().max(100).optional().or(z.literal('')),
  'Estado Civil': z
    .enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER'])
    .optional()
    .or(z.literal('')),
  Tags: z.string().optional().or(z.literal('')),
})

export type ClientImportRow = z.infer<typeof clientImportRowSchema>
```

- [ ] **5.4** Create `packages/core/src/modules/policy/application/policy-import-schema.ts` — Zod schema for policy CSV row validation:

```typescript
import { z } from 'zod'

export const policyImportRowSchema = z.object({
  'Numero Apolice': z.string().min(1),
  'CPF/CNPJ Cliente': z.string().min(11),
  Ramo: z.enum([
    'AUTO',
    'RESIDENTIAL',
    'CONDOMINIUM',
    'BUSINESS',
    'LIFE',
    'OTHER',
  ]),
  'Premio (R$)': z.string().pipe(z.coerce.number().positive()),
  'Inicio Vigencia': z.string().pipe(z.coerce.date()),
  'Fim Vigencia': z.string().pipe(z.coerce.date()),
  Seguradora: z.string().optional().or(z.literal('')),
  Status: z.enum(['ACTIVE', 'CANCELLED', 'EXPIRED']).default('ACTIVE'),
})

export type PolicyImportRow = z.infer<typeof policyImportRowSchema>
```

- [ ] **5.5** Export shared import types from `packages/core/src/index.ts` and schemas from module indexes.

- [ ] **5.6** Verify: `pnpm typecheck` passes

- [ ] **5.7** Commit: `feat(csv): add papaparse, import types, and row validation schemas`

---

### Task 6 — Import parse use cases (client + policy)

- [ ] **6.1** Create `packages/core/src/modules/client/application/parse-client-import.ts`:

```typescript
import { injectable, inject } from 'tsyringe'
import { parse } from 'papaparse'
import { randomUUID } from 'node:crypto'
import type { ClientRepository } from '../domain/client-repository.js'
import { clientImportRowSchema } from './client-import-schema.js'
import type {
  CsvImportParseResult,
  CsvRowError,
} from '../../shared/csv-import-types.js'
import {
  MAX_IMPORT_ROWS,
  MAX_IMPORT_ERRORS,
} from '../../shared/csv-import-types.js'

@injectable()
export class ParseClientImport {
  constructor(
    @inject('ClientRepository')
    private readonly clientRepo: ClientRepository
  ) {}

  async execute(
    csvContent: string,
    organizationId: string
  ): Promise<CsvImportParseResult> {
    const parsed = parse<Record<string, string>>(csvContent, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.data.length === 0) {
      throw new CsvImportError(
        'NO_VALID_ROWS',
        'Nenhuma linha encontrada no CSV'
      )
    }

    if (parsed.data.length > MAX_IMPORT_ROWS) {
      throw new CsvImportError(
        'TOO_MANY_ROWS',
        `Maximo de ${MAX_IMPORT_ROWS} linhas permitido`
      )
    }

    const errors: CsvRowError[] = []
    const validRows: Record<string, unknown>[] = []

    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i]
      if (!row) continue

      const result = clientImportRowSchema.safeParse(row)
      if (!result.success) {
        if (errors.length < MAX_IMPORT_ERRORS) {
          for (const issue of result.error.issues) {
            errors.push({
              row: i + 2, // 1-based + header
              field: issue.path.join('.'),
              message: issue.message,
              value: String(row[issue.path[0] as string] ?? ''),
            })
          }
        }
      } else {
        validRows.push(result.data)
      }
    }

    const total = parsed.data.length
    const invalid = total - validRows.length

    if (invalid > total * 0.5) {
      throw new CsvImportError(
        'TOO_MANY_ERRORS',
        `Mais de 50% das linhas sao invalidas (${invalid}/${total})`
      )
    }

    if (validRows.length === 0) {
      throw new CsvImportError(
        'NO_VALID_ROWS',
        'Nenhuma linha valida encontrada'
      )
    }

    const jobId = randomUUID()
    const preview = parsed.data.slice(0, 5)

    return {
      jobId,
      preview,
      validationSummary: {
        total,
        valid: validRows.length,
        invalid,
        errors,
      },
      validRows,
    }
  }
}

export class CsvImportError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'CsvImportError'
  }
}
```

- [ ] **6.2** Create `packages/core/src/modules/policy/application/parse-policy-import.ts` — same pattern as client, using `policyImportRowSchema`. Validates row data but does NOT check client existence (that happens in the worker).

- [ ] **6.3** Export `ParseClientImport` and `CsvImportError` from `packages/core/src/modules/client/index.ts`. Export `ParsePolicyImport` from `packages/core/src/modules/policy/index.ts`. Export `CsvImportError` from `packages/core/src/index.ts`.

- [ ] **6.4** Register both in `apps/server/src/container-registrations.ts`:
  - `container.register(ParseClientImport, { useFactory: () => new ParseClientImport(clientRepo) })`
  - `container.register(ParsePolicyImport, { useFactory: () => new ParsePolicyImport(policyRepo) })`

- [ ] **6.5** Verify: `pnpm typecheck` passes

- [ ] **6.6** Commit: `feat(csv): add parse-client-import and parse-policy-import use cases`

---

### Task 7 — Import routes (upload, confirm, status, template)

- [ ] **7.1** Create `apps/server/src/schemas/import.schemas.ts` — shared Zod schemas for import route params:

```typescript
import { z } from 'zod'

export const importJobIdParamSchema = z.object({
  jobId: z.string().uuid(),
})
```

- [ ] **7.2** Add client import routes in `apps/server/src/routes/v1/client-routes.ts` — add **BEFORE** `GET /api/v1/clients` (after the export route):
  - `GET /api/v1/clients/import/template` — RBAC `read:Client`, returns CSV template with headers + example row as `text/csv`
  - `POST /api/v1/clients/import` — RBAC `create:Client` (ADMIN+), accepts multipart file, validates size <= 5MB and `.csv` extension, calls `ParseClientImport.execute()`, stores `validRows` in Redis under the `jobId` key (TTL 30 min), returns `{ success: true, data: { jobId, preview, validationSummary } }`
  - `POST /api/v1/clients/import/:jobId/confirm` — RBAC `create:Client`, retrieves `validRows` from Redis, enqueues BullMQ job on `csv-import` queue with `CsvImportJobData`, returns `{ success: true, data: { jobId } }`
  - `GET /api/v1/clients/import/:jobId/status` — RBAC `create:Client`, fetches BullMQ job by ID, returns job state + progress

  For Redis access, use the same Redis connection from `@repo/env`. Import `Redis` from `ioredis` (already available in server). Store validated rows as JSON string with key `csv-import:${jobId}`.

  Handle `CsvImportError` with appropriate HTTP status codes (422 for validation, 413 for file size).

- [ ] **7.3** Add policy import routes in `apps/server/src/routes/v1/policy-routes.ts` — same pattern as client:
  - `GET /api/v1/policies/import/template`
  - `POST /api/v1/policies/import`
  - `POST /api/v1/policies/import/:jobId/confirm`
  - `GET /api/v1/policies/import/:jobId/status`

- [ ] **7.4** Define the CSV template content constants. Client template:

```
Nome,CPF/CNPJ,Tipo,Email,Telefone,Data Nascimento,Profissao,Estado Civil,Tags
Joao Silva,12345678901,CLIENT,joao@email.com,11999999999,1990-01-15,Engenheiro,MARRIED,vip;indicacao
```

Policy template:

```
Numero Apolice,CPF/CNPJ Cliente,Ramo,Premio (R$),Inicio Vigencia,Fim Vigencia,Seguradora,Status
APL-001,12345678901,AUTO,1500.00,2026-01-01,2027-01-01,Porto Seguro,ACTIVE
```

- [ ] **7.5** Verify: `pnpm typecheck` passes

- [ ] **7.6** Commit: `feat(csv): add import routes (upload, confirm, status, template)`

---

### Task 8 — BullMQ csv-import processor in apps/worker

- [ ] **8.1** Create `apps/worker/src/processors/csv-import-processor.ts`:

```typescript
import type { ConnectionOptions, Job } from 'bullmq'
import { Queue, Worker } from 'bullmq'
import { prisma } from '@repo/db'
import pino from 'pino'
import type { CsvImportJobData, CsvImportProgress } from '@repo/core'
import { IMPORT_BATCH_SIZE } from '@repo/core'

const logger = pino({ name: 'csv-import-processor' })
const QUEUE_NAME = 'csv-import'

export function setupCsvImportProcessor(connection: ConnectionOptions) {
  const queue = new Queue<CsvImportJobData>(QUEUE_NAME, { connection })

  const worker = new Worker<CsvImportJobData>(
    QUEUE_NAME,
    async (job: Job<CsvImportJobData>) => {
      const { entityType, organizationId, userId, rows, totalRows } = job.data
      const progress: CsvImportProgress = {
        processed: 0,
        created: 0,
        skipped: 0,
        failed: 0,
        total: totalRows,
        errors: [],
      }

      // Process in batches
      for (let i = 0; i < rows.length; i += IMPORT_BATCH_SIZE) {
        const batch = rows.slice(i, i + IMPORT_BATCH_SIZE)

        if (entityType === 'client') {
          await processClientBatch(batch, organizationId, progress)
        } else {
          await processPolicyBatch(batch, organizationId, userId, progress)
        }

        progress.processed += batch.length
        await job.updateProgress(progress)
      }

      return progress
    },
    { connection, concurrency: 2 }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'CSV import job failed')
  })

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'CSV import job completed')
  })

  return { queue, worker }
}
```

Implement `processClientBatch`: uses `prisma.client.createMany({ data: mappedBatch, skipDuplicates: true })`. Map each row to `CreateClientInput` shape with `organizationId`. Count created vs skipped by comparing before/after counts or using `createMany` result count. Push errors to `progress.errors` (capped at 100).

Implement `processPolicyBatch`: for each row, look up client by `document` + `organizationId`. If not found, mark as failed. Otherwise create policy with `prisma.policy.create()`. Use `skipDuplicates` on `policyNumber`. Set `salespersonId` to `userId`.

- [ ] **8.2** Register the processor in `apps/worker/src/index.ts`:
  - Import `setupCsvImportProcessor`
  - Add: `const csvImport = setupCsvImportProcessor(connection)`
  - Update the logger message to include `csv-import`
  - Add `csvImport.worker.close()` and `csvImport.queue.close()` to graceful shutdown

- [ ] **8.3** Export `CsvImportJobData`, `CsvImportProgress`, `IMPORT_BATCH_SIZE` from `packages/core/src/index.ts` (they are in `shared/csv-import-types.ts`).

- [ ] **8.4** Verify: `pnpm typecheck` passes for all packages (`apps/worker`, `packages/core`, `apps/server`)

- [ ] **8.5** Commit: `feat(csv): add BullMQ csv-import processor in apps/worker`

---

### Task 9 — Frontend: ImportDialog component and entity import buttons

- [ ] **9.1** Create `apps/web/src/components/import-dialog/types.ts`:

```typescript
export type ImportStep = 'upload' | 'preview' | 'processing' | 'results'

export interface CsvRowError {
  readonly row: number
  readonly field: string
  readonly message: string
  readonly value?: string
}

export interface CsvValidationSummary {
  readonly total: number
  readonly valid: number
  readonly invalid: number
  readonly errors: readonly CsvRowError[]
}

export interface ImportParseResponse {
  readonly jobId: string
  readonly preview: ReadonlyArray<Record<string, string>>
  readonly validationSummary: CsvValidationSummary
}

export interface ImportProgress {
  readonly processed: number
  readonly created: number
  readonly skipped: number
  readonly failed: number
  readonly total: number
  readonly errors: ReadonlyArray<{ row: number; message: string }>
}

export interface ImportStatusResponse {
  readonly status: 'active' | 'completed' | 'failed' | 'waiting'
  readonly progress: ImportProgress | null
}
```

- [ ] **9.2** Create `apps/web/src/components/import-dialog/upload-step.tsx` — drag-and-drop zone for CSV file + template download link. Accept `.csv` only, max 5MB. Props: `onFileSelect: (file: File) => void`, `templateEndpoint: string`, `isPending: boolean`.

- [ ] **9.3** Create `apps/web/src/components/import-dialog/preview-step.tsx` — table showing first 5 rows from `ImportParseResponse.preview` + validation summary (valid/invalid counts) + error list. Props: `parseResult: ImportParseResponse`, `onConfirm: () => void`, `onCancel: () => void`, `isPending: boolean`.

- [ ] **9.4** Create `apps/web/src/components/import-dialog/progress-step.tsx` — progress bar (processed/total) + live created/skipped/failed counts. Uses `useQuery` to poll `GET {endpoint}/{jobId}/status` every 2 seconds while status is `active` or `waiting`. Props: `endpoint: string`, `jobId: string`, `onComplete: (progress: ImportProgress) => void`.

- [ ] **9.5** Create `apps/web/src/components/import-dialog/results-step.tsx` — final summary card showing created/skipped/failed + error list (if any). Props: `progress: ImportProgress`, `onClose: () => void`.

- [ ] **9.6** Create `apps/web/src/components/import-dialog/import-dialog.tsx` — shell component managing the 4-step state machine (UPLOAD -> PREVIEW -> PROCESSING -> RESULTS). Uses Dialog from shadcn/ui. Handles:
  - Upload: sends multipart POST to `{endpoint}`, gets back `ImportParseResponse`
  - Preview: shows parsed data, on confirm sends `POST {endpoint}/{jobId}/confirm`
  - Processing: polls status until complete
  - Results: shows final summary, calls `onComplete` to refresh parent table

  Props match the spec:

  ```typescript
  interface ImportDialogProps {
    readonly entityType: 'client' | 'policy'
    readonly endpoint: string
    readonly templateEndpoint: string
    readonly open: boolean
    readonly onOpenChange: (open: boolean) => void
    readonly onComplete: () => void
  }
  ```

- [ ] **9.7** Create `apps/web/src/features/clients/components/client-import-button.tsx` — button that opens `ImportDialog` with:
  - `entityType="client"`
  - `endpoint="/api/v1/clients/import"`
  - `templateEndpoint="/api/v1/clients/import/template"`
  - `onComplete` invalidates clients query

- [ ] **9.8** Create `apps/web/src/features/policies/components/policy-import-button.tsx` — same pattern for policies.

- [ ] **9.9** Integrate import buttons into the respective toolbar areas:
  - `ClientImportButton` next to `ClientExportButton` in clients toolbar
  - `PolicyImportButton` next to `PolicyExportButton` in policies listing
  - (No import for proposals — proposals are export-only per spec)

- [ ] **9.10** Verify: `pnpm typecheck` and `pnpm lint` pass

- [ ] **9.11** Commit: `feat(csv): add ImportDialog component and import buttons for clients/policies`

---

### Task 10 — Phase 2 QA verification and final cleanup

- [ ] **10.1** Test full import flow for clients:
  - Download template CSV from template endpoint
  - Upload CSV file via import dialog
  - Verify preview step shows first 5 rows + validation summary
  - Confirm import and verify processing step shows progress
  - Verify results step shows correct created/skipped/failed counts
  - Verify imported clients appear in the clients list

- [ ] **10.2** Test full import flow for policies:
  - Same flow as clients
  - Verify client lookup by CPF/CNPJ works
  - Verify duplicate policyNumber is reported as skipped

- [ ] **10.3** Test error cases:
  - File too large (>5MB) shows error
  - Invalid CSV format shows error
  - More than 50% invalid rows rejects the import
  - Rows with duplicate `document` are skipped
  - Max 100 errors returned per import

- [ ] **10.4** Test RBAC:
  - Non-ADMIN users cannot access import routes (403)
  - Users with `read` ability can export
  - Users with `read` ability can download template

- [ ] **10.5** Run quality gates: `pnpm lint && pnpm typecheck && pnpm build`

- [ ] **10.6** Commit (if any fixes): `fix(csv): address Phase 2 QA findings`
