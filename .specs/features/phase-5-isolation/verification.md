# Verification: Phase 5 — Isolation and money

**Verdict**: PASS
**Profile**: standard
**Diff range**: working tree vs 585a7f10 (uncommitted; no Phase 5 commits)
**Round**: 2 - scoped
**Verifier**: independent sub-agent (author != verifier)

Range: working tree vs 585a7f10 (uncommitted; no Phase 5 commits). Real-tree porcelain recorded before work. After this file, porcelain matches that baseline (this path already existed under untracked `.specs/features/phase-5-isolation/`).

Round 1 ranked gap was C37 (`toBeGreaterThanOrEqual(400)` did not lock HTTP `400`). The only production/test change in scope is `create-claim.spec.ts:108` → `toBe(400)`. Proofs re-ran in full at the working tree this round. PASS judgments for C1–C36 and C38–C61 are carried from round 1. C37, the RegisterClaimFromChat Test policy row, and `create-claim.spec.ts` citations are re-judged. Coverage sets carried from round 1 (fix added no branch). Faults: C37 surface injected this round in a discarded worktree.

## Binding sources

Profile `standard` (not `ui`). Step 1 not required. No binding-source comparison this round.

## Checks

Proofs verified at working tree. PASS judgments for C1–C36 and C38–C61 carried from round 1. C37 re-judged this round.

This-round proof batches (every named test appeared individually as passed):

- `node --test scripts/phase-5-isolation.test.mjs` → tests 31, pass 31, fail 0, exit 0
- `pnpm --filter @repo/core exec vitest run` money / proposal / create-commission-for-policy / issue-policy / register-claim-from-chat `--reporter=verbose` with the C2–C5, C9, C14–C18, C29–C34 `-t` alternation → 16 passed, 30 skipped, exit 0
- `pnpm --filter @app/server exec vitest run` create-claim / get-entitlements / internal-auth / internal-rate-limit `--reporter=verbose` with the C37, C40–C42, C51, C52 `-t` alternation → 6 passed, 17 skipped, exit 0; named C37 `returns 400 when required fields are missing` ✓
- `pnpm --filter @app/chat-worker exec vitest run` baileys-manager / record-ai-usage-adapter `--reporter=verbose` with the C45–C48, C55 `-t` alternation → 5 passed, exit 0
- `pnpm --filter @app/worker exec vitest run` record-ai-usage-processor `--reporter=verbose` with the C56, C57 `-t` alternation → 2 passed, exit 0
- `pnpm --filter @repo/shared exec vitest run src/contact-source.spec.ts --reporter=verbose -t "ContactSource union has the six Prisma enum values"` → 1 passed, exit 0

| Check | Claim | Proof run | Evidence | Result |
| --- | --- | --- | --- | --- |
| C1 | money.ts exports branded `Cents`/`BasisPoints`, `applyBasisPoints`, `reaisToCents` | characterization batch this round; named test `money.ts exports Cents BasisPoints applyBasisPoints reaisToCents` ✔ | `scripts/phase-5-isolation.test.mjs:38-41` - `assert.match(text, /export type Cents/)`; `/export type BasisPoints/`; `/export function applyBasisPoints/`; `/export function reaisToCents/`. Live `money.ts:1-2,6,17` are `type Cents = number` aliases (AD-005), not nominal brands; the named proof asserts the export forms, not branding | PASS |
| C2 | `applyBasisPoints(100000, 1500)` default split is `15000` | core verbose batch this round; named test ✔ | `money.spec.ts:7` - `expect(applyBasisPoints(100000, 1500)).toBe(15000)` | PASS |
| C3 | `applyBasisPoints` with `0` bp returns `0` | core verbose batch this round; named test ✔ | `money.spec.ts:10` - `expect(applyBasisPoints(100000, 0)).toBe(0)` | PASS |
| C4 | `applyBasisPoints(100000, 10000)` default split is `100000` | core verbose batch this round; named test ✔ | `money.spec.ts:13` - `expect(applyBasisPoints(100000, 10000)).toBe(100000)` | PASS |
| C5 | `reaisToCents(0.285)` is `28` | core verbose batch this round; named test ✔ | `money.spec.ts:16` - `expect(reaisToCents(0.285)).toBe(28)`. Live `money.ts:18` is `Math.round(reais * 100)` (IEEE 28, not 29) | PASS |
| C6 | calculator calls `applyBasisPoints`, no `BASIS_POINTS_DIVISOR` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:48-49` - `assert.match(text, /applyBasisPoints/)`; `assert.doesNotMatch(text, /BASIS_POINTS_DIVISOR/)` | PASS |
| C7 | ImportPolicyRow uses `reaisToCents`, not `Math.round(premioReais * 100)` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:56-57` | PASS |
| C8 | `ProposalProps` has `commissionBasisPoints`, not `commissionPercentageInCents` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:68-69` | PASS |
| C9 | `toJSON()` emits `commissionPercentageInCents` equal to `commissionBasisPoints`, no key `commissionBasisPoints` | core verbose batch this round; named test ✔ | `proposal.spec.ts:206-208` - `expect(json.commissionPercentageInCents).toBe(1500)`; `expect(Object.hasOwn(json, 'commissionBasisPoints')).toBe(false)`; `expect(proposal.commissionBasisPoints).toBe(1500)` | PASS |
| C10 | proposal detail Zod keeps `commissionPercentageInCents` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:74` | PASS |
| C11 | mapper column `commissionPercentageInCents` ↔ domain `commissionBasisPoints` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:83-85` | PASS |
| C12 | commission index exports `CreateCommissionForPolicy`, not `OnPolicyIssued` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:90-91` | PASS |
| C13 | `on-policy-issued.ts` does not exist | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:95-103` - `assert.equal(existsSync(...on-policy-issued.ts), false)` | PASS |
| C14 | percentage `0` does not `save`, returns `null` | core verbose batch this round; named test ✔ | `create-commission-for-policy.spec.ts:81-82` - `expect(repo.save).not.toHaveBeenCalled()`; `expect(result).toBeNull()` | PASS |
| C15 | percentage `-100` does not `save`, returns `null` | core verbose batch this round; named test ✔ | `create-commission-for-policy.spec.ts:91-92` - same two assertions (carried citation) | PASS |
| C16 | second same `policyId` saves once; second result equals first | core verbose batch this round; named test ✔ | `create-commission-for-policy.spec.ts:101-103` | PASS |
| C17 | existing reversal does not block a new non-reversal save | core verbose batch this round; named test ✔ | `create-commission-for-policy.spec.ts:117-122` | PASS |
| C18 | `IssuePolicy` calls `CreateCommissionForPolicy` with `proposal.commissionBasisPoints` | core verbose batch this round; named test ✔ | `issue-policy.spec.ts:467-470` - `toHaveBeenCalledWith(expect.objectContaining({ commissionPercentageInBasisPoints: proposal.commissionBasisPoints }))` | PASS |
| C19 | `issue-policy.ts` does not import `OnPolicyIssued` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:110` | PASS |
| C20 | `issuePolicy` stays on `POST /api/v1/policies` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:115-117` | PASS |
| C21 | commission notification templates exist with export names | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:127-128` | PASS |
| C22 | `claim-opened.ts` exports `claimOpenedEmail` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:135` | PASS |
| C23 | notification email-templates dropped the three moved files | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:143-145` | PASS |
| C24 | commission module has zero `notification/infrastructure` imports | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:153` | PASS |
| C25 | servicing module has zero `notification/infrastructure` imports | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:161` | PASS |
| C26 | notification index does not export the three moved names | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:166-168` | PASS |
| C27 | owning use cases still call the three moved functions | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:181-183` | PASS |
| C28 | `register-claim-from-chat.ts` exports `RegisterClaimFromChat` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:190` | PASS |
| C29 | missing client: no `CreateClaim`, `dataSaved` true, frozen message | core verbose batch this round; named test ✔ | `register-claim-from-chat.spec.ts:151-157` - `not.toHaveBeenCalled()`; `claimCreated` false; `claimNumber` null; `dataSaved` true; message `Cliente não encontrado. Dados registrados para o corretor.` Live comment `register-claim-from-chat.ts:72` S9 | PASS |
| C30 | no ACTIVE policy: same S9 shape, other frozen message | core verbose batch this round; named test ✔ | `register-claim-from-chat.spec.ts:175-181` - same four fields; message `Nenhuma apólice ativa encontrada. Dados registrados para o corretor.` | PASS |
| C31 | ACTIVE policy: `URGENT`, `SIN-`+number, `dataSaved` false, `claimData` null | core verbose batch this round; named test ✔ | `register-claim-from-chat.spec.ts:197-206` - `priority: 'URGENT'`; `claimNumber` ``SIN-${String(claim.claimNumber)}``; `dataSaved` false; `claimData` null | PASS |
| C32 | 11 and 14 digit documents lookup `documentHash`, not phone | core verbose batch this round; named test ✔ | `register-claim-from-chat.spec.ts:220-232` | PASS |
| C33 | non-document `phoneOrDocument` lookups contact by raw phone | core verbose batch this round; named test ✔ | `register-claim-from-chat.spec.ts:248-249` - `findByPhone` with raw `'1198888777'` | PASS |
| C34 | picks ACTIVE policy with greatest `endDate` | core verbose batch this round; named test ✔ | `register-claim-from-chat.spec.ts:272-274` - `policyId: 'pol-new'` | PASS |
| C35 | internal `create-claim.ts` has no `@repo/db` / `createTenantClient` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:195-196` | PASS |
| C36 | `createInternalClaim` stays on `POST /api/internal/claims` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:201-203` | PASS |
| C37 | `POST /api/internal/claims` without `description` responds `400` | server verbose batch this round; named test `returns 400 when required fields are missing` ✔ | `create-claim.spec.ts:108` - `expect(response.statusCode).toBe(400)`. Payload is `{ phoneOrDocument }` only. Live schema `schemas/index.ts:86` `description: z.string().min(1)`. Assertion locks exact `400` | PASS |
| C38 | `register-claim-from-chat.ts` comments `S9` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:210` | PASS |
| C39 | `getInternalEntitlements` on GET entitlements path | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:217-221` | PASS |
| C40 | HMAC match + subscription → `200`, `success` true, `data.maxChannels` from use case | server verbose batch this round; named test ✔ | `get-entitlements.spec.ts:38-42` - `statusCode` 200; `body.success` true; `body.data.maxChannels` 5 | PASS |
| C41 | no subscription → `200`, data equals `DEFAULT_PERMISSIVE_ENTITLEMENTS`, `trialEndsAt` null | server verbose batch this round; named test ✔ | `get-entitlements.spec.ts:51-57` | PASS |
| C42 | path org ≠ HMAC org → `403` `TENANT_MISMATCH` | server verbose batch this round; named test ✔ | `get-entitlements.spec.ts:65-69` - `statusCode` 403; `body.error.code` `'TENANT_MISMATCH'` | PASS |
| C43 | internal billing routes have no `@repo/db` import | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:229` | PASS |
| C44 | `baileys-manager.ts` has no `@repo/core` or `@repo/db` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:235-236` | PASS |
| C45 | entitlements fetch uses 3000ms abort and HMAC headers | chat-worker verbose batch this round; named test ✔ | `baileys-manager.spec.ts:94-104` - `timeoutSpy` called with `3000`; headers `X-Signature`, `X-Timestamp`, `X-Tenant-Id` | PASS |
| C46 | fetch reject / non-OK → `connectChannel` rejects, channel not in map | chat-worker verbose batch this round; named test ✔ | `baileys-manager.spec.ts:110-122` | PASS |
| C47 | `maxChannels` null → effective limit `10` | chat-worker verbose batch this round; named test ✔ | `baileys-manager.spec.ts:128-129` - `toBe(10)` | PASS |
| C48 | `maxChannels` 3 → effective limit `3` | chat-worker verbose batch this round; named test ✔ | `baileys-manager.spec.ts:135` - `expect(limit).toBe(3)` | PASS |
| C49 | subscription cache prefix stays `sub:` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:241` | PASS |
| C50 | entitlements route mounted behind HMAC then internal rate limit | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:248-250`. Assembly `app.ts:375-378` | PASS |
| C51 | missing `x-signature` still `401` | server verbose batch this round; named test ✔ | `internal-auth-middleware.spec.ts:76-81` - `reply.status` 401; `error.code` `'UNAUTHORIZED'` | PASS |
| C52 | internal rate limit still `429` with `Retry-After` | server verbose batch this round; named test ✔ | `internal-rate-limit.spec.ts:179-186` - status 429; header `Retry-After`; `error.code` `'RATE_LIMIT_EXCEEDED'` | PASS |
| C53 | ERP worker consumes `erp-record-ai-usage` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:255` | PASS |
| C54 | adapter enqueues `erp-record-ai-usage` without `@repo/core` or `@repo/db` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:260-262` | PASS |
| C55 | enqueue throw is swallowed | chat-worker verbose batch this round; named test ✔ | `record-ai-usage-adapter.spec.ts:16-17` | PASS |
| C56 | existing `messageIdHash` skips `RecordAiUsage.execute` | worker verbose batch this round; named test ✔ | `record-ai-usage-processor.spec.ts:23-24` | PASS |
| C57 | missing/`null` `messageIdHash` calls `RecordAiUsage` once per job | worker verbose batch this round; named test ✔ | `record-ai-usage-processor.spec.ts:34-40` | PASS |
| C58 | chat-worker `package.json` has no `@repo/core` or `@repo/db` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:267-268` | PASS |
| C59 | tsup `noExternal` drops core and db | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:273-274` | PASS |
| C60 | chat-worker `ContactSource` from `@repo/shared`, not `@repo/db` | characterization batch this round; named test ✔ | `scripts/phase-5-isolation.test.mjs:283-284` | PASS |
| C61 | `ContactSource` union is the six Prisma enum values | shared verbose batch this round; named test ✔ | `contact-source.spec.ts:7-16` - `CONTACT_SOURCE_VALUES` equals `['MANUAL','CHAT_WHATSAPP','CHAT_WIDGET','FORM_WEB','IMPORT','REFERRAL']`; length 6 | PASS |

## Coverage

Carried from round 1. Fix added no branch. Reconfirmed: C37 is not an unproven member of any set that claims `400`. Swept validation names C37 for Zod `400`; the proof now locks exact `400` (`create-claim.spec.ts:108` `toBe(400)`). Existing `POST /api/internal/claims` `400` remains claimed by C37 and is still not a member of the sets below. Unproven `-` on every set.

| Set (size) | Recomputed from | Member -> proof | Unproven |
| --- | --- | --- | --- |
| Landing doors (4) | plan `Landing` + AD-005–AD-008 | money kernel C1, C6, C8, C9 · CreateCommissionForPolicy C12, C16 · HMAC entitlements C39, C44 · `erp-record-ai-usage` C53, C58 | - |
| money rounding (4) | live `money.ts` + AC 2–5 | 1500 bp → 15000 C2 · 0 bp C3 · 10000 bp C4 · `0.285` → `28` C5 | - |
| CreateCommissionForPolicy branches (5) | live `create-commission-for-policy.ts:21-38` | rate 0 C14 · rate `-100` C15 · first save C16 · second same `policyId` C16 · reversal ignored C17 | - |
| S9 claim responses (3) | live `register-claim-from-chat.ts:72-127` | missing client C29 · no ACTIVE policy C30 · created URGENT C31 | - |
| phoneOrDocument lookup (3) | live resolve-client branches | 11-digit `documentHash` C32 · 14-digit `documentHash` C32 · raw phone C33 | - |
| `GET /api/internal/billing/entitlements/:organizationId` statuses (4) | plan `Surface` | 200 C40 · 401 C51 · 403 C42 · 429 C52 | - |
| baileys entitlements outcomes (4) | live `getChannelLimitForOrg` | 3000ms abort C45 · fetch fail rejects C46 · `maxChannels` null → 10 C47 · `maxChannels` 3 → 3 C48 | - |
| AI usage write paths (4) | live adapter + processor | enqueue C54 · swallow C55 · skip duplicate hash C56 · missing hash inserts C57 | - |
| ContactSource union (6) | live `CONTACT_SOURCE_VALUES` | table-driven over all 6 C61 | - |
| frozen operationId + method + URL (3) | live route files | `issuePolicy` C20 · `createInternalClaim` C36 · `getInternalEntitlements` C39 | - |
| startup config: HMAC entitlements mount (2 assemblies) | live `app.ts:375-378`; `baileys-manager.ts:53-60` | `app.ts` internalApp C50 · chat-worker fetch C45 | - |

C5 stays `28`. S9 `dataSaved: true` stays on C29/C30. Queue name stays `erp-record-ai-usage`. Entitlements stay fail-closed (C46 rejects connect).

## Test policy

RegisterClaimFromChat + HTTP 400 row re-judged this round (`create-claim.spec.ts` is the file the fix touched). Other rows carried from round 1.

| Row | Files it classifies | Required proof | Expectation met |
| --- | --- | --- | --- |
| Decides, own layer: money rounding table | `packages/core/src/shared-kernel/money.ts` | C2–C5 at own layer | yes - four rows asserted in `money.spec.ts:7,10,13,16` |
| Decides: CreateCommissionForPolicy + IssuePolicy consumer | `create-commission-for-policy.ts`, `issue-policy.ts` | C14–C17 own layer; C18 consumer | yes - skip 0/`-100`, idempotent save-once, reversal, IssuePolicy passes `commissionBasisPoints` |
| Decides: RegisterClaimFromChat + HTTP 400 boundary | `register-claim-from-chat.ts`, internal `create-claim.ts` | C29–C34 own layer; HTTP 400 C37 at the boundary | yes - C29–C34 assert the own-layer table; C37 `create-claim.spec.ts:108` is `expect(response.statusCode).toBe(400)` |
| Decides, reached across HTTP: get-entitlements | `get-entitlements.ts` | C40–C42 at the boundary | yes - 200 maxChannels, 200 defaults, 403 `TENANT_MISMATCH` |
| Decides: baileys channel cap | `baileys-manager.ts` | C45–C48 at own layer | yes |
| Decides: AI usage skip vs insert | `record-ai-usage-processor.ts` | C56, C57 | yes |
| Instrumentation: HMAC `forTenant` extension | compose / internal create-claim | covered by C35 and consumer route | yes - C35 omits `@repo/db`; C36 frozen operationId |
| Instrumentation: template `git mv` | moved notification files | C21–C27 | yes |

## Faults injected

Verified at working tree. Round 2 re-injected the surface the fix created (`toBe(400)` had never been made to fail). Cap 5; this round 1 inject. Round 1 C5/C14/C29/C42/C56 surfaces were not re-injected (fix could not have touched them).

Worktree: `git worktree add /tmp/p5-isolation-verify-r2 585a7f10`, then `git diff HEAD | git apply` plus copy of untracked Phase 5 files. Fault only in scratch `schemas/index.ts` (dropped required `description`). Named proof `-t "returns 400 when required fields are missing"` exit 1. Real tree porcelain unchanged. Scratch removed with `git worktree remove --force`.

| Mutation | Location | Killed |
| --- | --- | --- |
| dropped `description` from `createInternalClaimBodySchema` so missing description is accepted | scratch `apps/server/src/routes/internal/leads/schemas/index.ts` (was line 86 `description: z.string().min(1)`) | yes - named proof `returns 400 when required fields are missing` exit 1; `expected 201 to be 400` at scratch `create-claim.spec.ts:108` |

## Gate

C1–C61 this-round batches: characterization 31/31; core 16 named; server 6 named including C37; chat-worker 5 named; worker 2 named; shared 1 named. 0 failed.

## Result

PASS
