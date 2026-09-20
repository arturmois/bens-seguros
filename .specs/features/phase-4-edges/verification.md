# Phase 4 — Edges use modules verification

**Verdict**: PASS
**Profile**: standard
**Diff range**: 3b678008..535a78ab
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Fix range `a0022931..535a78ab`. Real tree porcelain before and after: `?? .specs/features/phase-4-edges/verification.md`. Fault injection ran in discarded `git worktree` `/tmp/p4-r2-scratch` at `HEAD`; scratch removed and pruned; porcelain matches baseline; `HEAD` still `535a78ab`.

Round 1 gaps re-judged below. Every named proof exists (`rg`) and ran individually at this `HEAD`. Extra tests beyond the frozen proofs are used as evidence where the fix added them.

## Binding sources

carried from a0022931 (step 1 is `ui`; the fix did not touch an interface). Sources were re-opened this round only to recompute Coverage. Plan `Surface: None`, `Relations: None`. Roadmap T4.5 `5k-row timing ≤ +20% locally` remains outside checks: `Swept > observability` is `n/a` with an approved reason, so it is not an uncovered check.

| Source | Opened | Contradiction | Uncovered |
| --- | --- | --- | --- |
| `docs/architecture-refactoring-roadmap.md` §12 Phase 4, T4.1–T4.6 | yes - read in tree | none | - |
| `docs/architecture/forbidden-deps.md` | yes - read in tree | none | - |
| plan `Landing` (3 one-way doors), `Surface`, `Relations` | yes - read in tree | none | - |
| UI / screen design | n/a - no screens | n/a | n/a |

## Checks

verified at 535a78ab (all named proofs re-run). Evidence citations carried from a0022931 except rows whose files the fix touched (C2–C4, C19, C20 operationId, C28, C48, C59–C66) and extra tests added in the fix.

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | `AttachProposalDocument` exported | `node --test scripts/phase-4-edges.test.mjs` exit 0 | `scripts/phase-4-edges.test.mjs:31` - `assert.match(text, /export class AttachProposalDocument/)` | PASS |
| C2 | `DRIVER_LICENSE` persists + `driver_license` | core unit batch exit 0 | `attach-proposal-document.spec.ts:59,61-65` - `expect(uploadDocument.execute).toHaveBeenCalledOnce()`; `toHaveBeenCalledWith({... itemKey: 'driver_license' })` | PASS |
| C3 | `VEHICLE_REGISTRATION` → `vehicle_registration` | core unit batch exit 0 | `attach-proposal-document.spec.ts:82-86` - `expect(autoComplete.execute).toHaveBeenCalledWith({... itemKey: 'vehicle_registration' })` | PASS |
| C4 | auto-complete throw still returns document | core unit batch exit 0 | `attach-proposal-document.spec.ts:100` - `expect(result.id).toBe('doc-1')` | PASS |
| C5 | `upload-document.ts` has no sales/AutoComplete import | script batch exit 0 | `scripts/phase-4-edges.test.mjs:38-39` - `assert.doesNotMatch(text, /AutoCompleteChecklistItems/)`; `assert.doesNotMatch(text, /modules\/sales/)` | PASS |
| C6 | document module has zero sales imports | script batch exit 0 | `scripts/phase-4-edges.test.mjs:47-51` - `assert.equal(fromSales.length, 0, ...)` | PASS |
| C7 | `entityType=PROPOSAL` → attach, not upload | server batch exit 0 | `upload-document.spec.ts:135-136` - `expect(mockAttachExecute).toHaveBeenCalledOnce()`; `expect(mockUploadExecute).not.toHaveBeenCalled()` | PASS |
| C8 | `entityType=CLIENT` → upload, not attach | server batch exit 0 | `upload-document.spec.ts:108-109` - `expect(mockUploadExecute).toHaveBeenCalledOnce()`; `expect(mockAttachExecute).not.toHaveBeenCalled()` | PASS |
| C9 | `uploadDocument` operationId frozen | script batch exit 0 | `scripts/phase-4-edges.test.mjs:59-61` - `operationId:\s*'uploadDocument'`, `method:\s*'POST'`, `url:\s*'/api/v1/documents/upload'` | PASS |
| C10 | `forbidden-deps.md` drops `proposal⇄document` | script batch exit 0 | `scripts/phase-4-edges.test.mjs:66` - `assert.doesNotMatch(text, /proposal⇄document/)` | PASS |
| C11 | `CaptureLead` exported | script batch exit 0 | `scripts/phase-4-edges.test.mjs:73` - `assert.match(text, /export class CaptureLead/)` | PASS |
| C12 | `ContactRepository.findByPhone` declared | script batch exit 0 | `scripts/phase-4-edges.test.mjs:80-83` - `/findByPhone\(\s*phone:\s*string,\s*organizationId:\s*string\s*\)/` | PASS |
| C13 | `MemberRepository.findOldestActive` declared | script batch exit 0 | `scripts/phase-4-edges.test.mjs:90` - `/findOldestActive\(organizationId: string\)/` | PASS |
| C14 | existing phone reuses contact, skips `CreateContact` | core unit batch exit 0 | `capture-lead.spec.ts:84-86` - `expect(createContact.execute).not.toHaveBeenCalled()`; `expect(result.contactId).toBe('contact-existing')` | PASS |
| C15 | new phone → `consentLgpd: true`, oldest member, `MANUAL` | core unit batch exit 0 | `capture-lead.spec.ts:97-104` - `toHaveBeenCalledWith({... source: 'MANUAL', salespersonId: 'user-oldest', consentLgpd: true })` | PASS |
| C16 | `TRAVEL` → branch `OTHER`, `NEW_INSURANCE` | core unit batch exit 0 | `capture-lead.spec.ts:115-120` - `toHaveBeenCalledWith(expect.objectContaining({ branch: 'OTHER', boardType: 'NEW_INSURANCE' }))` | PASS |
| C17 | throws `NO_MEMBER` / `No active member in org` | core unit batch exit 0 | `capture-lead.spec.ts:137-138` - `expect('code' in error && error.code).toBe('NO_MEMBER')`; `expect(error.message).toBe('No active member in org')` | PASS |
| C18 | route maps it to `400` `NO_MEMBER` + message | server batch exit 0 | `create-lead.spec.ts:72,75-76` - `expect(response.statusCode).toBe(400)`; `expect(body.error.code).toBe('NO_MEMBER')`; `expect(body.error.message).toBe('No active member in org')` | PASS |
| C19 | `create-lead.ts` has no `@repo/db` / `createTenantClient` | script batch exit 0 | `scripts/phase-4-edges.test.mjs:95-96` - `assert.doesNotMatch(text, /from ['"]@repo\/db/)`; `.../createTenantClient/` | PASS |
| C20 | `createLead` on `POST /api/internal/leads`, `201` body keys + message | server batch + script batch exit 0 | `create-lead.spec.ts:51-56` - `toBe(201)`; `body.data.proposalId`; `body.data.contactId`; `expect(body.data.message).toBe('Lead registrado: João Silva - AUTO')`. operationId literal: `scripts/phase-4-edges.test.mjs:97` - `assert.match(text, /operationId:\s*'createLead'/)` | PASS |
| C21 | org B tenant `findByPhone` returns `null` for org A contact | core:db batch exit 0 | `prisma-contact-repository.db.spec.ts:41` - `expect(row).toBeNull()` | PASS |
| C22 | chat-worker path + 5 body keys unchanged | script batch exit 0 | `scripts/phase-4-edges.test.mjs:104-109` - `assert.match` on `/api/internal/leads`, `clientName`, `clientPhone`, `insuranceType`, `notes`, `source` | PASS |
| C23 | `notes` not passed to `CreateContact` | core unit batch exit 0 | `capture-lead.spec.ts:153` - `expect(input).not.toHaveProperty('notes')` | PASS |
| C24 | three internal routes have no `@repo/db` | script batch exit 0 | `scripts/phase-4-edges.test.mjs:119-120` - loop, `assert.doesNotMatch(text, /from ['"]@repo\/db/)`; `.../createTenantClient/` | PASS |
| C25 | proposals `400` `MISSING_PARAMS` + message | server batch exit 0 | `list-proposals.spec.ts:81,84-87` - `toBe(400)`; `expect(body.error.code).toBe('MISSING_PARAMS')`; `expect(body.error.message).toBe('At least one of clientId or phone is required')` | PASS |
| C26 | policies `400` `MISSING_PARAMS` + message | server batch exit 0 | `list-policies.spec.ts:68,71-74` - same three assertions | PASS |
| C27 | unresolved client → `200` `[]` / `0` | server batch exit 0 | `list-proposals.spec.ts:70,72-73` - `toBe(200)`; `expect(body.data.proposals).toHaveLength(0)`; `expect(body.data.total).toBe(0)` | PASS |
| C28 | at most 10 proposals ordered by `createdAt` desc with 7 keys | core unit batch exit 0; extra db spec exit 0 | `list-proposals-for-client.spec.ts:49,54,56-57,60-71` - `toHaveLength(10)`; `expect(createdAtTimes).toEqual([...].sort((a, b) => b - a))`; `expect(ids[0]).toBe('p-12')`; `expect(ids).not.toContain('p-old')`; seven keys. Extra live proof: `list-proposals-for-client.db.spec.ts:142,146-147` - length 10; first id is newest `ids[10]`; oldest `ids[0]` excluded | PASS |
| C29 | at most 10 `ACTIVE` policies, `policyNumber` string | core unit batch exit 0 | `list-active-policies-for-client.spec.ts:52-54` - `toHaveLength(10)`; `every(status === 'ACTIVE')`; `expect(typeof ...policyNumber).toBe('string')` | PASS |
| C30 | `404` `CLIENT_NOT_FOUND` / `Client not found` | server batch exit 0 | `update-client.spec.ts:78,80-81` - `toBe(404)`; `expect(body.error.code).toBe('CLIENT_NOT_FOUND')`; `expect(body.error.message).toBe('Client not found')` | PASS |
| C31 | bad digit count → `400` `INVALID_DOCUMENT` | server batch exit 0 | `update-client.spec.ts:90,92` - `toBe(400)`; `expect(body.error.code).toBe('INVALID_DOCUMENT')` | PASS |
| C32 | valid document persists 3 fiscal fields | server batch exit 0 | `update-client.spec.ts:102-110` - `expect(mockUpdate).toHaveBeenCalledWith('client-001', TEST_ORG_ID, expect.objectContaining({ document, documentHash, documentEncrypted }))` | PASS |
| C33 | email-only writes no `email` on client | core unit batch exit 0 | `update-client-fiscal.spec.ts:50` - `expect(payload).not.toHaveProperty('email')` | PASS |
| C34 | `forTenant` uses `createTenantClient`, not `prismaAdmin` | server batch exit 0 | `compose.spec.ts:68,71` - `expect(source).not.toMatch(/prismaAdmin/)`; `expect(source).toMatch(/createTenantClient\(organizationId\)/)`. Assembly: `compose.ts:41` `const prisma = createTenantClient(organizationId)` | PASS |
| C35 | org B tenant does not list org A proposals | core:db batch exit 0 | `list-proposals-for-client.db.spec.ts:62` - `expect(result.proposals.map((item) => item.id)).not.toContain(proposal.id)` | PASS |
| C36 | three internal operationIds frozen on method + URL | script batch exit 0 | `scripts/phase-4-edges.test.mjs:128-142` - `listInternalProposals`/`GET`/`/api/internal/proposals`, `listInternalPolicies`/`GET`/`/api/internal/policies`, `updateClientInternal`/`PUT`/`/api/internal/clients/:id` | PASS |
| C37 | success returns `Dados do cliente atualizados` | server batch exit 0 | `update-client.spec.ts:125` - `expect(body.data.message).toBe('Dados do cliente atualizados')` | PASS |
| C38 | `updateMany` where/data, no `organizationId` | core unit batch exit 0 | `expire-due-policies.spec.ts:12-19` - `toHaveBeenCalledWith({ where: { status: 'ACTIVE', endDate: { lt: now } }, data: { status: 'EXPIRED' } })`; `expect(Object.hasOwn(args.where, 'organizationId')).toBe(false)` | PASS |
| C39 | expire processor has no `prismaAdmin.policy` | script batch exit 0 | `scripts/phase-4-edges.test.mjs:149` - `assert.doesNotMatch(text, /prismaAdmin\.policy/)` | PASS |
| C40 | ACTIVE past `endDate` → `EXPIRED` | core:db batch exit 0 | `expire-due-policies.db.spec.ts:91` - `expect(past?.status).toBe('EXPIRED')` | PASS |
| C41 | CANCELLED and future ACTIVE untouched | core:db batch exit 0 | `expire-due-policies.db.spec.ts:156-157` - `expect(cancelled?.status).toBe('CANCELLED')`; `expect(future?.status).toBe('ACTIVE')` | PASS |
| C42 | `sentToClientAt` is the passed `sentAt` | core unit batch exit 0 | `mark-quote-sent.spec.ts:19-23` - `toHaveBeenCalledWith({ proposalId, organizationId, sentToClientAt: sentAt })` | PASS |
| C43 | stamp after successful send, with ids | worker batch exit 0 | `send-quote-email-processor.spec.ts:52-58` - `expect(send).toHaveBeenCalledOnce()`; `expect(execute).toHaveBeenCalledWith(expect.objectContaining({ proposalId: 'prop-1', organizationId: 'org-1' }))` | PASS |
| C44 | send throws → no stamp | worker batch exit 0 | `send-quote-email-processor.spec.ts:82-83` - `.rejects.toThrow('smtp down')`; `expect(execute).not.toHaveBeenCalled()` | PASS |
| C45 | send-quote processor has no `prismaAdmin.proposal` | script batch exit 0 | `scripts/phase-4-edges.test.mjs:156` - `assert.doesNotMatch(text, /prismaAdmin\.proposal/)` | PASS |
| C46 | no `RESEND_API_KEY` → no stamp | worker batch exit 0 | `send-quote-email-processor.spec.ts:98-99` - `expect(send).not.toHaveBeenCalled()`; `expect(execute).not.toHaveBeenCalled()` | PASS |
| C47 | stagnant = non-terminal, undeleted, `updatedAt` < now−15d | core:db batch exit 0 | `find-stagnant-proposals.db.spec.ts:90-94` - `toContain(stagnant.id)`; `not.toContain(fresh.id)`, `lost.id`, `issued.id`, `deleted.id` | PASS |
| C48 | expiring = ACTIVE undeleted on calendar day now+30/15/7 | core:db batch exit 0 | `find-expiring-policies.db.spec.ts:148-153` - `byDays.get(30/15/7)).toContain(...)`; `not.toContain(cancelled)`; `not.toContain(outside)`; `not.toContain(deletedId)` (soft-deleted ACTIVE seeded at :118-129) | PASS |
| C49 | pending commercial, undeleted, `createdAt` < now−7d | core:db batch exit 0 | `find-pending-commissions.db.spec.ts:111-114` - `toContain(oldPending)`; `not.toContain(freshPending)`, `paidOld`, `deletedOld` | PASS |
| C50 | 4 stalled statuses, undeleted, `updatedAt` < now−7d | core:db batch exit 0 | `find-stalled-claims.db.spec.ts:130-136` - `toContain(stalled)`, `analysis`, `awaiting`, `inspection`; `not.toContain(fresh)`, `completed`, `deleted` | PASS |
| C51 | `check-proposals-stagnant.ts` no `prismaAdmin.proposal` | script batch exit 0 | `scripts/phase-4-edges.test.mjs:163` - `assert.doesNotMatch(text, /prismaAdmin\.proposal/)` | PASS |
| C52 | `check-policy-expiry.ts` no `prismaAdmin.policy` | script batch exit 0 | `scripts/phase-4-edges.test.mjs:170` - `assert.doesNotMatch(text, /prismaAdmin\.policy/)` | PASS |
| C53 | `check-commissions-pending.ts` no `prismaAdmin.commission` | script batch exit 0 | `scripts/phase-4-edges.test.mjs:177` - `assert.doesNotMatch(text, /prismaAdmin\.commission/)` | PASS |
| C54 | `check-claims-stalled.ts` no `prismaAdmin.claim` | script batch exit 0 | `scripts/phase-4-edges.test.mjs:184` - `assert.doesNotMatch(text, /prismaAdmin\.claim/)` | PASS |
| C55 | stagnant body copy, unaccented `estagio` | worker batch exit 0 | `check-proposals-stagnant.spec.ts:40-48` - `body: \`Proposta de Maria Silva parada no estagio QUOTE ha ${daysSinceUpdate} dias\`` | PASS |
| C56 | expiry titles `<= 7` vs else, body copy | worker batch exit 0 | `check-policy-expiry.spec.ts:59-62` - `toContain('Apolice vencendo em breve!')`; `toContain('Apolice expirando')`; `toContain('Apolice 1007 vence em 7 dias')`; `toContain('Apolice 1015 vence em 15 dias')` | PASS |
| C57 | stalled claim body, unaccented `atualizacao` | worker batch exit 0 | `check-claims-stalled.spec.ts:39-47` - `body: \`Sinistro #42 sem atualizacao ha ${daysSinceUpdate} dias\`` | PASS |
| C58 | `hasExistingAlert` kept + org loop kept | script batch exit 0 | `scripts/phase-4-edges.test.mjs:195,198-199` - `assert.match(text, /hasExistingAlert/)`; `organization.findMany`; `for \(const org of organizations\)` | PASS |
| C59 | characterization counts + two pt-BR messages | worker batch exit 0 | `csv-import-processor.spec.ts:85-91` - `expect(progress.created).toBe(1)`; `skipped).toBe(1)`; `failed).toBe(2)`; two `não encontrado` / `não tem Contact vinculado` messages | PASS |
| C60 | existing `documentHash` → skipped, no second client | core unit batch exit 0 | `import-client-row.spec.ts:40-41` - `expect(result).toEqual({ status: 'skipped' })`; `expect(saveClient).not.toHaveBeenCalled()` | PASS |
| C61 | new document → client + contact `IMPORT` / `consentLgpd` | core unit batch exit 0 | `import-client-row.spec.ts:65-75` - `toEqual({ status: 'created' })`; `expect(saveContact).toHaveBeenCalledWith(expect.objectContaining({ source: 'IMPORT', consentLgpd: true, ... }))` | PASS |
| C62 | existing `policyNumber` → skipped, no proposal/policy | core unit batch exit 0 | `import-policy-row.spec.ts:44-46` - `toEqual({ status: 'skipped' })`; `expect(stores.createImportedIssued).not.toHaveBeenCalled()`; `createImportedPolicy` likewise | PASS |
| C63 | no `IssuePolicy`; `POLICY_ISSUED` proposal, commission `0` | core unit batch exit 0 | `import-policy-row.spec.ts:57-72` - `toHaveBeenCalledWith({... stage: 'POLICY_ISSUED', boardType: 'NEW_INSURANCE', commissionPercentageInCents: 0 })`; `expect(source).not.toMatch(/IssuePolicy/)` on `import-policy-row.ts` via `readFileSync` | PASS |
| C64 | csv processor no `@repo/db` / four `prismaAdmin` tables | script batch exit 0 | `scripts/phase-4-edges.test.mjs:204-208` - `assert.doesNotMatch` on `/from ['"]@repo\/db/`, `prismaAdmin\.client`, `.contact`, `.proposal`, `.policy` | PASS |
| C65 | batch `50`, error cap `100` | script batch + extra worker spec exit 0 | Named proof: `scripts/phase-4-edges.test.mjs:216-217` - `IMPORT_BATCH_SIZE = 50`, `MAX_IMPORT_ERRORS = 100`. Extra behaviour: `csv-import-processor.spec.ts:121-123` - `expect(progress.failed).toBe(101)`; `expect(progress.errors).toHaveLength(100)`; `expect(updateProgress).toHaveBeenCalledTimes(3)` | PASS |
| C66 | same fixture, same counts/messages after the move | worker batch exit 0 (shared C59 run, declared) | `csv-import-processor.spec.ts:85-91` - same assertions as C59 | PASS |

## Coverage

verified at 535a78ab. Recomputed from code and plan `Landing` / `Observable`. Previously unproven members re-joined to proofs the fix added.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| Landing doors (3) | plan `Landing` table | tenant factory C19, C24, C34 + assembly `compose.ts:41` / `app.ts:376` · documents↛sales C1, C5, C6, C10 · `ImportPolicyRow` relocates D4 C63, C64 | - |
| doc types that auto-complete (2) | `DOCUMENT_TYPE_TO_ITEM_KEY`, `attach-proposal-document.ts:14-19` | `DRIVER_LICENSE` C2 · `VEHICLE_REGISTRATION` C3 | - |
| `AttachProposalDocument` guard branches (5) | `attach-proposal-document.ts:34-48` | non-`PROPOSAL` :34 → `attach-proposal-document.spec.ts:115` `expect(autoComplete.execute).not.toHaveBeenCalled()` · no `type` :34 → `:123` · unmapped `type` :36 → `:134` · success :38 C2, C3 · catch :43 C4 | - |
| upload dispatch outcomes (2) | `upload-document.ts` ternary `entityType === 'PROPOSAL'` | `PROPOSAL` C7 · non-`PROPOSAL` C8 | - |
| HMAC mapped errors (6) | the four route files + `handle-domain-error.ts` | `NO_MEMBER` C18 · proposals `MISSING_PARAMS` C25 · policies `MISSING_PARAMS` C26 · `CLIENT_NOT_FOUND` C30 · `INVALID_DOCUMENT` C31 · `VALIDATION_ERROR` at `create-lead.spec.ts:125` | - |
| frozen operationId + method + URL (5) | the 5 route files this phase touches | `uploadDocument` C9 · `listInternalProposals` C36 · `listInternalPolicies` C36 · `updateClientInternal` C36 · `createLead` `scripts/phase-4-edges.test.mjs:97-99` (`operationId`/`POST`/`/api/internal/leads`) plus C20 body | - |
| chat-worker body keys (5) | `apps/chat-worker/src/tools/capture-lead.ts:64-70` | `clientName`, `clientPhone`, `insuranceType`, `notes`, `source` all C22 | - |
| expire `updateMany` boundaries (3) | `expire-due-policies.ts` + `prisma-policy-repository.ts:221-229` | ACTIVE past C40 · CANCELLED C41 · future ACTIVE C41 | - |
| `MarkQuoteSent` call conditions (3) | `send-quote-email-processor.ts` branch points | no key/provider C46 · send throws C44 · success C43 | - |
| alert query kinds (4) | `processors/alerts/*` + the four `Find*` use cases | stagnant C47 · expiring C48 · pending commission C49 · stalled claims C50 | - |
| stalled claim statuses (4) | `find-stalled-claims.ts` status list | `REGISTERED`, `IN_ANALYSIS`, `AWAITING_DOCUMENT`, `PENDING_INSPECTION` all C50 | - |
| expiring-policy predicate clauses (3) | `prisma-policy-repository.ts:238-244` | `status: 'ACTIVE'` C48 · `endDate` windows 30/15/7 C48 · `deletedAt: null` C48 `find-expiring-policies.db.spec.ts:153` `not.toContain(deletedId)` | - |
| alert copy strings (3) | the three processor templates | stagnant `estagio` C55 · `Apolice` title + body C56 · stalled `atualizacao` C57 | - |
| CSV row outcomes (5) | `import-policy-row.ts` / `import-client-row.ts` return paths | failed "não encontrado" C59 · skipped existing policy C62, C59 · failed "não tem Contact vinculado" C59 · created C61, C63, C59 · catch-all failed `import-client-row.spec.ts:95` / `import-policy-row.spec.ts:87` `expect(result).toEqual({ status: 'failed', message: 'write failed' })` | - |
| tenant isolation assemblies (2) | the two `createTenantClient` db specs | contact `findByPhone` C21 · list proposals C35 | - |
| startup config: HMAC factory (2 assemblies) | read directly | `compose.ts:40-78` `forTenant` news repos on `createTenantClient(organizationId)` · `app.ts:373-376` registers `createInternalLeadRoutes({ forTenant })` behind `internalAuthMiddleware` + `createInternalRateLimitHook` | - |

Claims naming a status code, route or response shape (C7, C8, C18, C20, C25, C26, C27, C30, C31, C37) each have a proof that crosses the HTTP boundary. Claims naming a DB isolation or expiry boundary (C21, C35, C40, C41, C47, C48, C49, C50) each have a `core:db` proof.

`Swept` rows resolving to **existing** were carried: HMAC + rate limit at `app.ts:374-375`; `requireAbility('create', 'Document')` on the upload route. `n/a` rows remain approved policy.

## Test policy rows

verified at 535a78ab for the previously unmet `AttachProposalDocument` row and for rows classifying files the fix touched (`attach-proposal-document.ts`, `import-client-row.ts`, `import-policy-row.ts`, `csv-import-processor.ts`). Other rows carried from a0022931 after confirming they still hold.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, reached across a boundary | `create-lead.ts` | boundary C18, C20 · own layer C14-C17, C23 | yes |
| Decides, reached across a boundary | `upload-document.ts` → `AttachProposalDocument` | boundary C7, C8 · own layer C2, C3, C4 plus entityType / missing type / unmapped type at the class | yes |
| Decides, reached across a boundary | `csv-import-processor.ts` | own layer C60-C63 · characterization C59 · catch-all failed at `ImportClientRow` / `ImportPolicyRow` | yes |
| Decides, reached across a boundary | `check-policy-expiry.ts` | C48 windows · C56 copy | yes |
| Decides, not reached across a boundary | `expire-policies-processor.ts` | C38 own layer · C40, C41 db | yes |
| Decides, not reached across a boundary | `send-quote-email-processor.ts` | C43, C44, C46 | yes |
| Entry point that decides nothing | internal `list-proposals.ts`, `list-policies.ts`, `update-client.ts`, v1 `upload-document.ts` | one at the boundary; accepted + each rejected input | yes |
| Instrumentation, pass-throughs | HMAC `forTenant` | none of its own; C34 assembly + consumer routes | yes |

`AttachProposalDocument` own-layer cases now present: `CLIENT entityType does not auto-complete` (`:115`), `missing type does not auto-complete` (`:123`), `unmapped document type does not auto-complete` (`:134`).

## Faults injected

verified at 535a78ab. Scratch `git worktree add /tmp/p4-r2-scratch HEAD`, `node_modules` and `.env` symlinked from the real tree. One fault per surface, cap 5. Scratch removed with `git worktree remove --force`; real tree porcelain matches baseline.

| Mutation | Location | Killed |
| --- | --- | --- |
| `orderBy: { createdAt: 'desc' }` → `'asc'` in `listForClient` | `prisma-proposal-repository.ts:122` | yes |
| use-case sort `right - left` → `left - right` | `list-proposals-for-client.ts:46` | yes |
| `operationId: 'createLead'` → `'createLeads'` | `create-lead.ts:17` | yes |
| unmapped `type` falls through to `'driver_license'` | `attach-proposal-document.ts:35-36` | yes |
| `ImportClientRow` catch returns `{ status: 'created' }` | `import-client-row.ts:115` | yes |

Fault 1: named unit proof `list-proposals-for-client.spec.ts` stayed green (it mocks `listForClient`). Live db spec `returns the 10 newest proposals by createdAt desc` failed at `list-proposals-for-client.db.spec.ts:146` (`expected ids[10]`, got an older id) because `take: 10` plus ascending order returns the oldest window. Round 1 mutant is dead.

Fault 2: C28 unit proof failed at `list-proposals-for-client.spec.ts:54` (`createdAtTimes` not descending).

Fault 3: `scripts/phase-4-edges.test.mjs:97` `assert.match(/operationId:\s*'createLead'/)` failed.

Fault 4: `attach-proposal-document.spec.ts:134` `expect(autoComplete.execute).not.toHaveBeenCalled()` failed (spy called with `itemKey: 'driver_license'`).

Fault 5: `import-client-row.spec.ts:95` expected `{ status: 'failed', message: 'write failed' }`, received `{ status: 'created' }`.

## Gate

verified at 535a78ab.

`node --test scripts/phase-4-edges.test.mjs` - 21 passed, 0 failed
`pnpm --filter @repo/core exec vitest run --project unit <9 files>` - 22 passed, 0 failed
`pnpm --filter @repo/core exec vitest run --project core:db <7 files>` - 9 passed, 0 failed
`pnpm --filter @app/server exec vitest run <6 files>` - 25 passed, 0 failed
`pnpm --filter @app/worker exec vitest run <5 files>` - 8 passed, 0 failed

Total: 85 passed, 0 failed. Every named test appeared individually in the output (core:db two-test files confirmed with `--reporter=verbose`). All 28 named proof files exist in the tree and sit inside `3b678008..HEAD`.
