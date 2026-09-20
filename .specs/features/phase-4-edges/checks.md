# Phase 4 — Edges use modules checks

Profile: standard
Plan: `.specs/features/phase-4-edges/plan.md`

66 checks in 6 slices · 3 one-way doors · 8 open, of which 0 block

## Checks

Grouped by the spec's slices; numbering runs across the whole feature.

### S1 - Invert documents → proposals (T4.2) · ~12 files · ~40k

**C1** · closed - `packages/core/src/modules/sales/proposals/application/attach-proposal-document.ts` exports class `AttachProposalDocument` (DOC-01, AC 1, door 2)
Proof: `node --test --test-name-pattern "attach-proposal-document exports AttachProposalDocument" scripts/phase-4-edges.test.mjs`

**C2** · closed - `AttachProposalDocument.execute` with `entityType` `PROPOSAL` and `type` `DRIVER_LICENSE` persists a document and calls `AutoCompleteChecklistItems.execute` with `itemKey` `driver_license` (DOC-01, AC 2, door 2)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/proposals/application/attach-proposal-document.spec.ts -t "DRIVER_LICENSE persists document and auto-completes driver_license"`

**C3** · closed - `AttachProposalDocument.execute` with `entityType` `PROPOSAL` and `type` `VEHICLE_REGISTRATION` calls `AutoCompleteChecklistItems.execute` with `itemKey` `vehicle_registration` (DOC-01, AC 3, door 2)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/proposals/application/attach-proposal-document.spec.ts -t "VEHICLE_REGISTRATION auto-completes vehicle_registration"`

**C4** · closed - when `AutoCompleteChecklistItems.execute` throws, `AttachProposalDocument.execute` still returns the persisted document (DOC-01, AC 4, door 2)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/proposals/application/attach-proposal-document.spec.ts -t "auto-complete throw still returns the document"`

**C5** · closed - `packages/core/src/modules/document/application/upload-document.ts` does not import `AutoCompleteChecklistItems` and does not contain the path segment `modules/sales` (DOC-02, AC 5, door 2)
Proof: `node --test --test-name-pattern "upload-document.ts has no sales or AutoComplete import" scripts/phase-4-edges.test.mjs`

**C6** · closed - `rg "from ['\\\"].*sales" packages/core/src/modules/document` prints zero matching lines (DOC-02, AC 6, door 2)
Proof: `node --test --test-name-pattern "document module has zero sales imports" scripts/phase-4-edges.test.mjs`

**C7** · closed - `POST /api/v1/documents/upload` with `entityType=PROPOSAL` calls `attachProposalDocument.execute` and does not call `uploadDocument.execute` (DOC-03, AC 7, door 2)
Proof: `pnpm --filter @app/server exec vitest run src/routes/v1/documents/__tests__/upload-document.spec.ts -t "PROPOSAL entityType calls attachProposalDocument not uploadDocument"`

**C8** · closed - `POST /api/v1/documents/upload` with `entityType=CLIENT` calls `uploadDocument.execute` and does not call `attachProposalDocument.execute` (DOC-03, AC 8, door 2)
Proof: `pnpm --filter @app/server exec vitest run src/routes/v1/documents/__tests__/upload-document.spec.ts -t "CLIENT entityType calls uploadDocument not attachProposalDocument"`

**C9** · closed - `apps/server/src/routes/v1/documents/upload-document.ts` keeps `operationId` `uploadDocument` on `POST` `/api/v1/documents/upload` (DOC-03, AC 9)
Proof: `node --test --test-name-pattern "uploadDocument operationId stays on POST /api/v1/documents/upload" scripts/phase-4-edges.test.mjs`

**C10** · closed - `docs/architecture/forbidden-deps.md` does not list `proposal⇄document` as a live cross-module hotspot (DOC-02, AC 10, door 2)
Proof: `node --test --test-name-pattern "forbidden-deps drops proposal document cycle" scripts/phase-4-edges.test.mjs`

### S2 - `sales.CaptureLead` (T4.1) · ~15 files · ~50k

**C11** · closed - `packages/core/src/modules/sales/leads/application/capture-lead.ts` exports class `CaptureLead` (LEAD-01, AC 11, door 1)
Proof: `node --test --test-name-pattern "capture-lead exports CaptureLead" scripts/phase-4-edges.test.mjs`

**C12** · closed - `ContactRepository` declares `findByPhone(phone: string, organizationId: string)` (LEAD-01, AC 12)
Proof: `node --test --test-name-pattern "ContactRepository declares findByPhone" scripts/phase-4-edges.test.mjs`

**C13** · closed - `MemberRepository` declares `findOldestActive(organizationId: string)` (LEAD-01, AC 13)
Proof: `node --test --test-name-pattern "MemberRepository declares findOldestActive" scripts/phase-4-edges.test.mjs`

**C14** · closed - `CaptureLead.execute` with a `clientPhone` that already has a non-deleted contact in that org reuses that contact `id` and does not call `CreateContact.execute` (LEAD-02, AC 14)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/leads/application/capture-lead.spec.ts -t "reuses existing contact by phone and skips CreateContact"`

**C15** · closed - `CaptureLead.execute` with a new phone calls `CreateContact.execute` with `consentLgpd: true`, `salespersonId` of `findOldestActive.userId`, and `source` `'MANUAL'` when input source is omitted (LEAD-02, AC 15)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/leads/application/capture-lead.spec.ts -t "new phone CreateContact consentLgpd true oldest member MANUAL"`

**C16** · closed - `CaptureLead.execute` with `insuranceType` `TRAVEL` calls `CreateProposal.execute` with `branch` `'OTHER'` and `boardType` `'NEW_INSURANCE'` (LEAD-02, AC 16)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/leads/application/capture-lead.spec.ts -t "TRAVEL maps to branch OTHER NEW_INSURANCE"`

**C17** · closed - `CaptureLead.execute` throws an error whose `code` is `NO_MEMBER` and whose `message` is `No active member in org` when `findOldestActive` returns `null` (LEAD-03, AC 17)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/leads/application/capture-lead.spec.ts -t "throws NO_MEMBER No active member in org"`

**C18** · closed - `POST /api/internal/leads` maps that error to status `400` with JSON `error.code` `NO_MEMBER` and `error.message` `No active member in org` (LEAD-03, AC 18)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/leads/__tests__/create-lead.spec.ts -t "returns 400 NO_MEMBER No active member in org"`

**C19** · closed - `apps/server/src/routes/internal/leads/create-lead.ts` contains neither `from '@repo/db'` nor `createTenantClient` (LEAD-04, AC 19, door 1)
Proof: `node --test --test-name-pattern "create-lead.ts has no @repo/db import" scripts/phase-4-edges.test.mjs`

**C20** · closed - `createLead` stays on `POST` `/api/internal/leads` and a `201` body has keys `proposalId`, `contactId`, and `message` matching `Lead registrado: ${contactName} - ${insuranceType}` (LEAD-03, AC 20)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/leads/__tests__/create-lead.spec.ts -t "creates a new contact and proposal when contact does not exist"`

**C21** · closed - `findByPhone` invoked with a tenant client for organization B returns `null` for a contact saved under organization A (RLS-01, AC 21, door 1)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db src/modules/sales/leads/infrastructure/prisma-contact-repository.db.spec.ts -t "findByPhone under org B tenant returns null"`

**C22** · closed - `apps/chat-worker/src/tools/capture-lead.ts` still contains `/api/internal/leads` and still sends JSON keys `clientName`, `clientPhone`, `insuranceType`, `notes`, and `source` (LEAD-04, AC 22)
Proof: `node --test --test-name-pattern "chat-worker capture-lead path and body keys unchanged" scripts/phase-4-edges.test.mjs`

**C23** · closed - `CaptureLead.execute` does not pass `notes` into `CreateContact.execute` (LEAD-02, AC 23)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/leads/application/capture-lead.spec.ts -t "does not persist notes on CreateContact"`

### S3 - Internal list/update through modules (T4.3) · ~12 files · ~40k

**C24** · closed - `list-proposals.ts`, `list-policies.ts`, and `update-client.ts` under `apps/server/src/routes/internal/leads/` contain neither `from '@repo/db'` nor `createTenantClient` (INT-01, AC 24, door 1)
Proof: `node --test --test-name-pattern "internal list and update-client routes have no @repo/db" scripts/phase-4-edges.test.mjs`

**C25** · closed - `GET /api/internal/proposals` with neither `clientId` nor `phone` responds `400` with `error.code` `MISSING_PARAMS` and `error.message` `At least one of clientId or phone is required` (INT-02, AC 25)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/leads/__tests__/list-proposals.spec.ts -t "returns 400 when neither clientId nor phone is provided"`

**C26** · closed - `GET /api/internal/policies` with neither `clientId` nor `phone` responds `400` with `error.code` `MISSING_PARAMS` and `error.message` `At least one of clientId or phone is required` (INT-02, AC 25)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/leads/__tests__/list-policies.spec.ts -t "returns 400 when neither clientId nor phone is provided"`

**C27** · closed - `GET /api/internal/proposals` that cannot resolve a client responds `200` with `data.proposals` `[]` and `data.total` `0` (INT-02, AC 26)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/leads/__tests__/list-proposals.spec.ts -t "returns empty list when client is not found by phone"`

**C28** · closed - `GET /api/internal/proposals` for a resolved client returns at most `10` proposals ordered by `createdAt` descending with keys `id`, `branch`, `stage`, `premiumValueInCents`, `coverageStartDate`, `createdAt`, `clientName` (INT-02, AC 27)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/proposals/application/list-proposals-for-client.spec.ts -t "returns at most 10 proposals by createdAt desc with clientName"`

**C29** · closed - `GET /api/internal/policies` for a resolved client returns only `status` `ACTIVE` policies, at most `10`, with `policyNumber` as a string (INT-02, AC 28)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/policies/application/list-active-policies-for-client.spec.ts -t "returns at most 10 ACTIVE policies with policyNumber string"`

**C30** · closed - `PUT /api/internal/clients/:id` for an id the tenant cannot see responds `404` with `error.code` `CLIENT_NOT_FOUND` and `error.message` `Client not found` (INT-03, AC 29)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/leads/__tests__/update-client.spec.ts -t "returns 404 when client does not exist"`

**C31** · closed - `PUT /api/internal/clients/:id` with a document whose digit count is not `11` and not `14` responds `400` with `error.code` `INVALID_DOCUMENT` (INT-03, AC 30)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/leads/__tests__/update-client.spec.ts -t "returns 400 when document has invalid length"`

**C32** · closed - `PUT /api/internal/clients/:id` with an 11- or 14-digit document persists `document`, `documentHash`, and `documentEncrypted` (INT-03, AC 31)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/leads/__tests__/update-client.spec.ts -t "persists fiscal document fields when a valid document is provided"`

**C33** · closed - `UpdateClientFiscal.execute` with only `email` does not write an email field on `client` (INT-03, AC 32)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/client/application/update-client-fiscal.spec.ts -t "email-only input does not write email on client"`

**C34** · closed - HMAC `forTenant(organizationId)` constructs repositories with `createTenantClient(organizationId)` and does not pass `prismaAdmin` (RLS-01, AC 33, door 1)
Proof: `pnpm --filter @app/server exec vitest run src/bootstrap/compose.spec.ts -t "forTenant calls createTenantClient not prismaAdmin"`

**C35** · closed - organization B’s tenant client listing proposals does not include a proposal whose `organizationId` is A (RLS-01, AC 34, door 1)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db src/modules/sales/proposals/application/list-proposals-for-client.db.spec.ts -t "org B tenant does not list org A proposals"`

**C36** · closed - `listInternalProposals` stays on `GET` `/api/internal/proposals`, `listInternalPolicies` on `GET` `/api/internal/policies`, `updateClientInternal` on `PUT` `/api/internal/clients/:id` (INT-01, AC 35)
Proof: `node --test --test-name-pattern "internal list and update operationIds stay on the same method and URL" scripts/phase-4-edges.test.mjs`

**C37** · closed - a successful `PUT /api/internal/clients/:id` returns `data.message` `Dados do cliente atualizados` (INT-03, AC 36)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/leads/__tests__/update-client.spec.ts -t "updates multiple fields in a single request"`

### S4 - Worker sales writes (T4.4) · ~8 files · ~25k

**C38** · closed - `ExpireDuePolicies.execute({ now })` calls a `PolicyRepository` method whose `updateMany` `where` is `{ status: 'ACTIVE', endDate: { lt: now } }` and `data` is `{ status: 'EXPIRED' }` with no `organizationId` key (WRK-01, AC 37)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/policies/application/expire-due-policies.spec.ts -t "updateMany ACTIVE endDate lt now to EXPIRED without organizationId"`

**C39** · closed - `apps/worker/src/processors/expire-policies-processor.ts` does not contain `prismaAdmin.policy` (WRK-01, AC 38)
Proof: `node --test --test-name-pattern "expire-policies-processor has no prismaAdmin.policy" scripts/phase-4-edges.test.mjs`

**C40** · closed - an `ACTIVE` policy with `endDate` before `now` becomes `EXPIRED` (WRK-01, AC 39)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db src/modules/sales/policies/application/expire-due-policies.db.spec.ts -t "ACTIVE past endDate becomes EXPIRED"`

**C41** · closed - a `CANCELLED` policy stays `CANCELLED` and an `ACTIVE` policy with `endDate` after `now` stays `ACTIVE` (WRK-01, AC 39)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db src/modules/sales/policies/application/expire-due-policies.db.spec.ts -t "CANCELLED and future ACTIVE are untouched"`

**C42** · closed - `MarkQuoteSent.execute` sets `sentToClientAt` to the `sentAt` Date passed in (WRK-02, AC 40)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/proposals/application/mark-quote-sent.spec.ts -t "sets sentToClientAt to the sentAt argument"`

**C43** · closed - `send-quote-email-processor` calls `MarkQuoteSent` after `emailProvider.send` succeeds, with the job’s `proposalId` and `organizationId` (WRK-02, AC 41)
Proof: `pnpm --filter @app/worker exec vitest run src/processors/__tests__/send-quote-email-processor.spec.ts -t "MarkQuoteSent after successful send with proposalId organizationId"`

**C44** · closed - when `emailProvider.send` throws, the processor does not call `MarkQuoteSent` (WRK-02, AC 42)
Proof: `pnpm --filter @app/worker exec vitest run src/processors/__tests__/send-quote-email-processor.spec.ts -t "does not MarkQuoteSent when send throws"`

**C45** · closed - `apps/worker/src/processors/send-quote-email-processor.ts` does not contain `prismaAdmin.proposal` (WRK-02, AC 43)
Proof: `node --test --test-name-pattern "send-quote-email-processor has no prismaAdmin.proposal" scripts/phase-4-edges.test.mjs`

**C46** · closed - when `RESEND_API_KEY` is unset the processor returns without calling `MarkQuoteSent` (WRK-02, AC 44)
Proof: `pnpm --filter @app/worker exec vitest run src/processors/__tests__/send-quote-email-processor.spec.ts -t "skips MarkQuoteSent when RESEND_API_KEY is unset"`

### S5 - Alert queries owned by modules (T4.6) · ~12 files · ~30k

**C47** · closed - `FindStagnantProposals.execute({ organizationId, now, days: 15 })` returns proposals in that org whose `stage` is not `POLICY_ISSUED` or `LOST`, `deletedAt` is null, and `updatedAt` is before `now` minus 15 days (ALRT-01, AC 45)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db src/modules/sales/proposals/application/find-stagnant-proposals.db.spec.ts -t "stagnant is updatedAt before now minus 15 days excluding terminal stages"`

**C48** · closed - `FindExpiringPolicies.execute` with thresholds `[30, 15, 7]` returns `ACTIVE` undeleted policies whose `endDate` falls on the calendar day `now + thresholdDays` for each threshold (ALRT-01, AC 46)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db src/modules/sales/policies/application/find-expiring-policies.db.spec.ts -t "expiring windows 30 15 7 calendar days"`

**C49** · closed - `FindPendingCommissions.execute({ organizationId, now, days: 7 })` returns commissions with `status` `PENDING_COMMERCIAL`, `deletedAt` null, and `createdAt` before `now` minus 7 days (ALRT-01, AC 47)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db src/modules/commission/application/find-pending-commissions.db.spec.ts -t "pending commercial older than 7 days"`

**C50** · closed - `FindStalledClaims.execute({ organizationId, now, days: 7 })` returns claims whose `status` is one of `REGISTERED`, `IN_ANALYSIS`, `AWAITING_DOCUMENT`, `PENDING_INSPECTION`, `deletedAt` null, and `updatedAt` before `now` minus 7 days (ALRT-01, AC 48)
Proof: `pnpm --filter @repo/core exec vitest run --project core:db src/modules/servicing/claims/application/find-stalled-claims.db.spec.ts -t "stalled statuses older than 7 days"`

**C51** · closed - `apps/worker/src/processors/alerts/check-proposals-stagnant.ts` does not contain `prismaAdmin.proposal` (ALRT-02, AC 49)
Proof: `node --test --test-name-pattern "check-proposals-stagnant has no prismaAdmin.proposal" scripts/phase-4-edges.test.mjs`

**C52** · closed - `apps/worker/src/processors/alerts/check-policy-expiry.ts` does not contain `prismaAdmin.policy` (ALRT-02, AC 50)
Proof: `node --test --test-name-pattern "check-policy-expiry has no prismaAdmin.policy" scripts/phase-4-edges.test.mjs`

**C53** · closed - `apps/worker/src/processors/alerts/check-commissions-pending.ts` does not contain `prismaAdmin.commission` (ALRT-02, AC 51)
Proof: `node --test --test-name-pattern "check-commissions-pending has no prismaAdmin.commission" scripts/phase-4-edges.test.mjs`

**C54** · closed - `apps/worker/src/processors/alerts/check-claims-stalled.ts` does not contain `prismaAdmin.claim` (ALRT-02, AC 52)
Proof: `node --test --test-name-pattern "check-claims-stalled has no prismaAdmin.claim" scripts/phase-4-edges.test.mjs`

**C55** · closed - a stagnant proposal notification `body` is `Proposta de ${clientName} parada no estagio ${stage} ha ${daysSinceUpdate} dias` (ALRT-03, AC 53)
Proof: `pnpm --filter @app/worker exec vitest run src/processors/alerts/__tests__/check-proposals-stagnant.spec.ts -t "body uses unaccented estagio ha dias"`

**C56** · closed - an expiring policy with `days <= 7` uses title `Apolice vencendo em breve!`; otherwise `Apolice expirando`; body is `Apolice ${policyNumber} vence em ${days} dias` (ALRT-03, AC 54)
Proof: `pnpm --filter @app/worker exec vitest run src/processors/alerts/__tests__/check-policy-expiry.spec.ts -t "title Apolice vencendo em breve when days is 7 else Apolice expirando"`

**C57** · closed - a stalled claim notification `body` is `Sinistro #${claimNumber} sem atualizacao ha ${daysSinceUpdate} dias` (ALRT-03, AC 55)
Proof: `pnpm --filter @app/worker exec vitest run src/processors/alerts/__tests__/check-claims-stalled.spec.ts -t "body uses unaccented atualizacao ha dias"`

**C58** · closed - alert processors still call `hasExistingAlert` before enqueueing, and `alerts/index.ts` still iterates organizations (ALRT-03, AC 56)
Proof: `node --test --test-name-pattern "alerts keep hasExistingAlert and organization loop" scripts/phase-4-edges.test.mjs`

### S6 - CSV import through clients + sales (T4.5) · ~10 files · ~40k

**C59** - a characterization spec for mixed new / duplicate / missing-client / missing-contact rows asserts `created`, `skipped`, and `failed` counts plus messages `Cliente com CPF/CNPJ ${cpf} não encontrado` and `Cliente com CPF/CNPJ ${cpf} não tem Contact vinculado` (CSV-01, AC 57, door 3)
Proof: `pnpm --filter @app/worker exec vitest run src/processors/__tests__/csv-import-processor.spec.ts -t "characterization fixture counts and pt-BR messages"`

**C60** - `ImportClientRow` for an existing `documentHash` in the organization increments skipped and does not create a second client (CSV-02, AC 58)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/client/application/import-client-row.spec.ts -t "existing documentHash increments skipped"`

**C61** - `ImportClientRow` for a new document creates a client and a contact with `source` `'IMPORT'` and `consentLgpd` `true` (CSV-02, AC 59)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/client/application/import-client-row.spec.ts -t "new document creates client and contact IMPORT consentLgpd true"`

**C62** - `ImportPolicyRow` for an existing `policyNumber` in the organization increments skipped and does not create a proposal or policy (CSV-02, AC 60, door 3)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/policies/application/import-policy-row.spec.ts -t "existing policyNumber increments skipped"`

**C63** - `ImportPolicyRow` does not call `IssuePolicy`; a created policy is preceded by a proposal with `stage` `'POLICY_ISSUED'`, `boardType` `'NEW_INSURANCE'`, and `commissionPercentageInCents` `0` (CSV-02, AC 61, door 3)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/policies/application/import-policy-row.spec.ts -t "creates POLICY_ISSUED proposal commission 0 without IssuePolicy"`

**C64** - `apps/worker/src/processors/csv-import-processor.ts` does not contain `from '@repo/db'` and does not call `prismaAdmin.client`, `prismaAdmin.contact`, `prismaAdmin.proposal`, or `prismaAdmin.policy` (CSV-03, AC 62, door 3)
Proof: `node --test --test-name-pattern "csv-import-processor has no @repo/db or prismaAdmin table writes" scripts/phase-4-edges.test.mjs`

**C65** - the processor still slices rows with `IMPORT_BATCH_SIZE` `50` and caps `progress.errors` at `MAX_IMPORT_ERRORS` `100` (CSV-03, AC 63)
Proof: `node --test --test-name-pattern "csv-import-processor keeps IMPORT_BATCH_SIZE 50 and MAX_IMPORT_ERRORS 100" scripts/phase-4-edges.test.mjs`

**C66** - after the move, the characterization fixture from C59 produces the same `created`, `skipped`, `failed`, and `errors[].message` values (CSV-01, AC 64, door 3)
Proof: `pnpm --filter @app/worker exec vitest run src/processors/__tests__/csv-import-processor.spec.ts -t "characterization fixture counts and pt-BR messages"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| Landing doors (3) | HMAC `forTenant` C19, C24, C34 · documents↛sales C1, C5, C6, C10 · ImportPolicyRow D4 C63, C64 | - |
| proposal document types that auto-complete (2) | `DRIVER_LICENSE` C2 · `VEHICLE_REGISTRATION` C3 | - |
| upload dispatch entityTypes (2) | `PROPOSAL` C7 · `CLIENT` C8 | - |
| HMAC mapped errors (5) | `NO_MEMBER` C18 · proposals `MISSING_PARAMS` C25 · policies `MISSING_PARAMS` C26 · `CLIENT_NOT_FOUND` C30 · `INVALID_DOCUMENT` C31 | - |
| frozen operationId + method + URL (5) | `uploadDocument` C9 · `createLead` C20 · `listInternalProposals` C36 · `listInternalPolicies` C36 · `updateClientInternal` C36 | - |
| chat-worker body keys (5) | `clientName` C22 · `clientPhone` C22 · `insuranceType` C22 · `notes` C22 · `source` C22 | - |
| expire `updateMany` boundaries (3) | ACTIVE past C40 · CANCELLED C41 · future ACTIVE C41 | - |
| MarkQuoteSent call conditions (3) | after send C43 · send throws C44 · no `RESEND_API_KEY` C46 | - |
| alert query kinds (4) | stagnant C47 · expiring C48 · pending commission C49 · stalled claims C50 | - |
| stalled claim statuses (4) | `REGISTERED` C50 · `IN_ANALYSIS` C50 · `AWAITING_DOCUMENT` C50 · `PENDING_INSPECTION` C50 | - |
| expiry thresholds (3) | 30 C48 · 15 C48 · 7 C48 | - |
| alert copy strings (3) | stagnant `estagio` C55 · `Apolice` title/body C56 · stalled `atualizacao` C57 | - |
| CSV row outcomes (4) | new client C61 · existing hash skip C60 · missing client message C59 · existing policy skip C62 | - |
| tenant isolation assemblies (2) | contact `findByPhone` C21 · list proposals C35 | - |
| startup config: HMAC factory (2 assemblies) | `forTenant` in compose C34 · internal routes consume factory C19, C24 | - |

- Claims naming a status code, route or response shape: C7, C8, C18, C20, C25, C26, C27, C30, C31, C37 - each has a proof that crosses the HTTP boundary
- Claims naming a DB isolation or expiry boundary: C21, C35, C40, C41, C47, C48, C49, C50 - each has a `core:db` proof
- No other check claims more than the single case its proof exercises

C66 shares the C59 proof on purpose: AC 64 is the same fixture after the move, one run.

## Test policy

The repo says where tests live (`*.spec.ts`, `*.db.spec.ts`, `pnpm --filter … exec vitest run`) and how they are built (fakes vs Postgres harness). It does not say which level proves a decision table, or how many members of that table must be asserted. These rows apply to this feature only unless copied into guidelines.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, reached across a boundary | one at the boundary **and** one at its own layer | the contract at the boundary; one asserted case per row of the decision table at its own layer |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Entry point that decides nothing | one at the boundary | accepted input, each rejected input, each error path |
| Instrumentation, pass-throughs | none of its own | covered by its consumer's proof |

Evidence:

- `apps/server/src/routes/internal/leads/create-lead.ts`: dispatches over existing-phone vs new, no-member, TRAVEL→OTHER, source default — 4 branch points → decides. Closest analogue: `create-lead.spec.ts` already at the HTTP boundary; own-layer proof is `capture-lead.spec.ts` (C14–C17, C23)
- `packages/core/src/modules/document/application/upload-document.ts` (today): dispatches over entityType + document type + auto-complete catch — 3 branch points → decides. After invert, that table moves to `AttachProposalDocument`; analogue `upload-document.spec.ts` (6 cases at own layer). Required: C2, C3, C4 at own layer and C7, C8 at the route
- `apps/worker/src/processors/csv-import-processor.ts`: dispatches over existing hash, missing client, missing contact, existing policy number — 4 outcomes → decides. No analogue processor spec. Own-layer: C60–C63; characterization at processor: C59
- `apps/worker/src/processors/expire-policies-processor.ts`: forwards `updateMany` with a where-table (ACTIVE / endDate / not CANCELLED) → decides in the repository method. Analogue: `dunning-processor.spec.ts` (own layer, fakes). Required: C38 at own layer, C40–C41 at db
- `apps/worker/src/processors/send-quote-email-processor.ts`: 3 call conditions for the stamp → decides. Analogue: dunning skip-when-empty. Required: C43, C44, C46
- `check-policy-expiry.ts`: 3 thresholds × 2 titles → decides. Required: C48 (windows) and C56 (copy)
- HMAC `forTenant`: instrumentation that news repos — no own proof beyond C34 (assembly) and consumer routes

Cost: ~20 own-layer proofs across the six slices. Without these rows, TRAVEL→OTHER, auto-complete throw, expire CANCELLED, and CSV skip-vs-fail would be proven only by a path that happens to traverse them.

These rows stay in this file. They are not written into repo guidelines unless you say so.

## Swept

- validation: C25, C26, C31 - `MISSING_PARAMS`, `INVALID_DOCUMENT` digit lengths 11 and 14
- failure modes: C4, C17, C18, C44 - auto-complete throw, `NO_MEMBER`, send failure does not stamp
- idempotency: C14, C58, C60, C62 - phone reuse, `hasExistingAlert`, CSV skip on existing hash / policy number
- authorization: existing - HMAC `internalAuthMiddleware` + rate limit on `internalApp`; v1 upload `requireAbility('create', 'Document')`
- concurrency: n/a - no unique index on `contact.phone` (out of scope); expire `updateMany` is one statement
- data lifecycle: n/a - no stored-data shape change, nothing to backfill
- dependency failure: C46, C44 - missing `RESEND_API_KEY` skips; send throw skips stamp
- state transitions: C16, C40, C41, C63 - TRAVEL→OTHER; ACTIVE→EXPIRED only; CSV synthetic `POLICY_ISSUED` without `IssuePolicy`
- observability: n/a - 5k-row timing is a service target, not a single-run criterion; processor pino logs stay as they are

## Handoff

Intended split, with the arithmetic, written before any code:

- S1+S2+S3 (T4.2 + T4.1 + T4.3) ≈ 130k — documents invert + HMAC cluster, one builder
- S4+S5+S6 (T4.4 + T4.6 + T4.5) ≈ 95k — worker writes, alerts, CSV. Hand off after S3 if the running estimate crosses 150k; otherwise the same builder continues. Never split a slice.
