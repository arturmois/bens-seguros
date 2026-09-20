# Phase 5 — Isolation and money checks

Profile: standard
Plan: `.specs/features/phase-5-isolation/plan.md`

61 checks in 6 slices · 4 one-way doors · 0 open, of which 0 block

## Checks

Grouped by the spec's slices; numbering runs across the whole feature.

### S1 - Money kernel (T5.4) · ~12 files · ~25k

**C1** - `packages/core/src/shared-kernel/money.ts` exports branded types `Cents` and `BasisPoints` and functions `applyBasisPoints` and `reaisToCents` (MONEY-01, AC 1, door 1)
Proof: `node --test --test-name-pattern "money.ts exports Cents BasisPoints applyBasisPoints reaisToCents" scripts/phase-5-isolation.test.mjs`

**C2** - `applyBasisPoints` with cents `100000`, basis points `1500`, and the default split returns `15000` (MONEY-01, AC 2, door 1)
Proof: `pnpm --filter @repo/core exec vitest run src/shared-kernel/money.spec.ts -t "applyBasisPoints 100000c 1500bp default split is 15000"`

**C3** - `applyBasisPoints` with basis points `0` returns `0` (MONEY-01, AC 3, door 1)
Proof: `pnpm --filter @repo/core exec vitest run src/shared-kernel/money.spec.ts -t "applyBasisPoints 0 bp is 0"`

**C4** - `applyBasisPoints` with cents `100000`, basis points `10000`, and the default split returns `100000` (MONEY-01, AC 4, door 1)
Proof: `pnpm --filter @repo/core exec vitest run src/shared-kernel/money.spec.ts -t "applyBasisPoints 100000c 10000bp default split is 100000"`

**C5** - `reaisToCents(0.285)` returns `28` (MONEY-01, AC 5, door 1)
Proof: `pnpm --filter @repo/core exec vitest run src/shared-kernel/money.spec.ts -t "reaisToCents 0.285 is 28"`

**C6** - `packages/core/src/modules/commission/domain/commission-calculator.ts` calls `applyBasisPoints` and does not contain `BASIS_POINTS_DIVISOR` (MONEY-01, AC 6, door 1)
Proof: `node --test --test-name-pattern "commission-calculator calls applyBasisPoints without BASIS_POINTS_DIVISOR" scripts/phase-5-isolation.test.mjs`

**C7** - `ImportPolicyRow` persists premium via `reaisToCents` of raw `'Premio (R$)'` and the file does not contain `Math.round(premioReais * 100)` (MONEY-01, AC 7, door 1)
Proof: `node --test --test-name-pattern "ImportPolicyRow uses reaisToCents not Math.round premioReais" scripts/phase-5-isolation.test.mjs`

**C8** - `ProposalProps` declares `commissionBasisPoints` and does not declare `commissionPercentageInCents` (MONEY-01, AC 8, door 1)
Proof: `node --test --test-name-pattern "ProposalProps has commissionBasisPoints not commissionPercentageInCents" scripts/phase-5-isolation.test.mjs`

**C9** - `Proposal.toJSON()` includes key `commissionPercentageInCents` equal to `commissionBasisPoints` and does not include key `commissionBasisPoints` (MONEY-01, AC 9, door 1)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/proposals/domain/proposal.spec.ts -t "toJSON emits commissionPercentageInCents not commissionBasisPoints"`

**C10** - `apps/server/src/routes/v1/proposals/_schemas.ts` keeps Zod key `commissionPercentageInCents` on the proposal detail object (MONEY-01, AC 10, door 1)
Proof: `node --test --test-name-pattern "proposal detail schema keeps commissionPercentageInCents" scripts/phase-5-isolation.test.mjs`

**C11** - proposal Prisma mapping reads and writes column `commissionPercentageInCents` and assigns it to domain `commissionBasisPoints` (MONEY-01, AC 11, door 1)
Proof: `node --test --test-name-pattern "proposal mapper maps commissionPercentageInCents column to commissionBasisPoints" scripts/phase-5-isolation.test.mjs`

### S2 - CreateCommissionForPolicy (T5.3) · ~10 files · ~30k

**C12** - `packages/core/src/modules/commission/index.ts` exports `CreateCommissionForPolicy` and does not export `OnPolicyIssued` (COMM-01, AC 12, door 2)
Proof: `node --test --test-name-pattern "commission index exports CreateCommissionForPolicy not OnPolicyIssued" scripts/phase-5-isolation.test.mjs`

**C13** - path `packages/core/src/modules/commission/application/on-policy-issued.ts` does not exist (COMM-01, AC 13, door 2)
Proof: `node --test --test-name-pattern "on-policy-issued.ts does not exist" scripts/phase-5-isolation.test.mjs`

**C14** - `CreateCommissionForPolicy.execute` with `percentageInBasisPoints` `0` does not call `save` and returns `null` (COMM-01, AC 14, door 2)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/commission/application/create-commission-for-policy.spec.ts -t "percentage 0 does not save and returns null"`

**C15** - `CreateCommissionForPolicy.execute` with `percentageInBasisPoints` `-100` does not call `save` and returns `null` (COMM-01, AC 15, door 2)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/commission/application/create-commission-for-policy.spec.ts -t "percentage -100 does not save and returns null"`

**C16** - `CreateCommissionForPolicy.execute` twice with the same `policyId`, `organizationId`, and `percentageInBasisPoints` `1500` calls `save` once and the second result equals the first saved non-reversal commission (COMM-01, AC 16, door 2)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/commission/application/create-commission-for-policy.spec.ts -t "second call same policyId returns existing and saves once"`

**C17** - when only a reversal exists for that `policyId`, `CreateCommissionForPolicy.execute` saves a new non-reversal commission (COMM-01, AC 17, door 2)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/commission/application/create-commission-for-policy.spec.ts -t "existing reversal does not block a new non-reversal save"`

**C18** - `IssuePolicy.execute` that creates a policy calls `CreateCommissionForPolicy.execute` with `commissionPercentageInBasisPoints` equal to `proposal.commissionBasisPoints` (COMM-01, AC 18, door 2)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/sales/policies/application/issue-policy.spec.ts -t "calls CreateCommissionForPolicy with proposal commissionBasisPoints"`

**C19** - `packages/core/src/modules/sales/policies/application/issue-policy.ts` does not import `OnPolicyIssued` (COMM-01, AC 19, door 2)
Proof: `node --test --test-name-pattern "issue-policy.ts does not import OnPolicyIssued" scripts/phase-5-isolation.test.mjs`

**C20** - `apps/server/src/routes/v1/policies/issue-policy.ts` keeps `operationId` `issuePolicy` on `POST` `/api/v1/policies` (COMM-01, AC 20)
Proof: `node --test --test-name-pattern "issuePolicy operationId stays on POST /api/v1/policies" scripts/phase-5-isolation.test.mjs`

### S3 - Templates owned by commissions/servicing (T5.5) · ~8 files · ~15k

**C21** - `packages/core/src/modules/commission/infrastructure/notifications/commission-approved.ts` and `commission-rejected.ts` exist and export `commissionApprovedEmail` and `commissionRejectedEmail` (TMPL-01, AC 21)
Proof: `node --test --test-name-pattern "commission notification templates exist with export names" scripts/phase-5-isolation.test.mjs`

**C22** - `packages/core/src/modules/servicing/claims/infrastructure/notifications/claim-opened.ts` exists and exports `claimOpenedEmail` (TMPL-01, AC 22)
Proof: `node --test --test-name-pattern "claim-opened template exists with export name" scripts/phase-5-isolation.test.mjs`

**C23** - `packages/core/src/modules/notification/infrastructure/email-templates/` does not contain `commission-approved.ts`, `commission-rejected.ts`, or `claim-opened.ts` (TMPL-01, AC 23)
Proof: `node --test --test-name-pattern "notification email-templates dropped commission and claim files" scripts/phase-5-isolation.test.mjs`

**C24** - `rg "notification/infrastructure" packages/core/src/modules/commission` prints zero matching lines (TMPL-01, AC 24)
Proof: `node --test --test-name-pattern "commission module has zero notification/infrastructure imports" scripts/phase-5-isolation.test.mjs`

**C25** - `rg "notification/infrastructure" packages/core/src/modules/servicing` prints zero matching lines (TMPL-01, AC 25)
Proof: `node --test --test-name-pattern "servicing module has zero notification/infrastructure imports" scripts/phase-5-isolation.test.mjs`

**C26** - `packages/core/src/modules/notification/index.ts` does not export `commissionApprovedEmail`, `commissionRejectedEmail`, or `claimOpenedEmail` (TMPL-01, AC 26)
Proof: `node --test --test-name-pattern "notification index does not export moved template names" scripts/phase-5-isolation.test.mjs`

**C27** - `approve-commission-admin`, `reject-commission`, and `create-claim` still produce email HTML via `commissionApprovedEmail`, `commissionRejectedEmail`, and `claimOpenedEmail` (TMPL-01, AC 27)
Proof: `node --test --test-name-pattern "owning use cases still call the three moved template functions" scripts/phase-5-isolation.test.mjs`

### S4 - RegisterClaimFromChat (T5.6) · ~12 files · ~40k

**C28** - `packages/core/src/modules/servicing/claims/application/register-claim-from-chat.ts` exports class `RegisterClaimFromChat` (CLAIM-01, AC 28)
Proof: `node --test --test-name-pattern "register-claim-from-chat exports RegisterClaimFromChat" scripts/phase-5-isolation.test.mjs`

**C29** - when no client resolves, `RegisterClaimFromChat.execute` does not call `CreateClaim.execute` and returns `claimCreated` `false`, `claimNumber` `null`, `dataSaved` `true`, and `message` `Cliente não encontrado. Dados registrados para o corretor.` (CLAIM-01, AC 29)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/servicing/claims/application/register-claim-from-chat.spec.ts -t "missing client returns dataSaved true and does not CreateClaim"`

**C30** - when a client exists and no `ACTIVE` policy matches, it does not call `CreateClaim.execute` and returns `claimCreated` `false`, `claimNumber` `null`, `dataSaved` `true`, and `message` `Nenhuma apólice ativa encontrada. Dados registrados para o corretor.` (CLAIM-01, AC 30)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/servicing/claims/application/register-claim-from-chat.spec.ts -t "no ACTIVE policy returns dataSaved true and does not CreateClaim"`

**C31** - when a client and an `ACTIVE` policy exist, it calls `CreateClaim.execute` with `priority` `'URGENT'` and returns `claimCreated` `true`, `claimNumber` `SIN-` + `String(claim.claimNumber)`, `dataSaved` `false`, `claimData` `null`, and `message` `Sinistro ${claim.claimNumber} registrado com prioridade urgente.` (CLAIM-01, AC 31)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/servicing/claims/application/register-claim-from-chat.spec.ts -t "creates URGENT claim SIN-number dataSaved false"`

**C32** - `phoneOrDocument` with 11 or 14 digits after `stripNonDigits` looks up client by `documentHash` of those digits and does not query contact by phone (CLAIM-01, AC 32)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/servicing/claims/application/register-claim-from-chat.spec.ts -t "11 and 14 digit documents lookup documentHash not phone"`

**C33** - `phoneOrDocument` that is not 11 or 14 digits looks up contact `phone` equal to the raw string (CLAIM-01, AC 33)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/servicing/claims/application/register-claim-from-chat.spec.ts -t "non-document phoneOrDocument lookups contact by raw phone"`

**C34** - when more than one `ACTIVE` policy exists, the chosen policy is the one with the greatest `endDate` (CLAIM-01, AC 34)
Proof: `pnpm --filter @repo/core exec vitest run src/modules/servicing/claims/application/register-claim-from-chat.spec.ts -t "picks ACTIVE policy with greatest endDate"`

**C35** - `apps/server/src/routes/internal/leads/create-claim.ts` contains neither `from '@repo/db'` nor `createTenantClient` (CLAIM-01, AC 35, door 1 of Phase 4 / AD-003)
Proof: `node --test --test-name-pattern "internal create-claim.ts has no @repo/db import" scripts/phase-5-isolation.test.mjs`

**C36** - `createInternalClaim` stays on `POST` `/api/internal/claims` (CLAIM-01, AC 36)
Proof: `node --test --test-name-pattern "createInternalClaim operationId stays on POST /api/internal/claims" scripts/phase-5-isolation.test.mjs`

**C37** - `POST /api/internal/claims` without `description` responds `400` (CLAIM-01, AC 37)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/leads/__tests__/create-claim.spec.ts -t "returns 400 when required fields are missing"`

**C38** - `register-claim-from-chat.ts` contains the substring `S9` in a comment (CLAIM-01, AC 38)
Proof: `node --test --test-name-pattern "register-claim-from-chat.ts comments S9" scripts/phase-5-isolation.test.mjs`

### S5 - HMAC entitlements (T5.1) · ~12 files · ~45k

**C39** - `apps/server/src/routes/internal/billing/get-entitlements.ts` registers `GET` `/api/internal/billing/entitlements/:organizationId` with `operationId` `getInternalEntitlements` (ENT-01, AC 39, door 3)
Proof: `node --test --test-name-pattern "getInternalEntitlements on GET entitlements path" scripts/phase-5-isolation.test.mjs`

**C40** - that handler with HMAC `organizationId` equal to the path param and a subscription row responds `200` with `success` `true` and `data.maxChannels` equal to `GetEntitlementsForOrg` for that org (ENT-01, AC 40, door 3)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/billing/__tests__/get-entitlements.spec.ts -t "200 maxChannels from GetEntitlementsForOrg"`

**C41** - when no subscription row exists, the handler responds `200` and `data` equals `DEFAULT_PERMISSIVE_ENTITLEMENTS` with `trialEndsAt` `null` (ENT-01, AC 41, door 3)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/billing/__tests__/get-entitlements.spec.ts -t "200 DEFAULT_PERMISSIVE_ENTITLEMENTS trialEndsAt null"`

**C42** - when path `organizationId` is not equal to HMAC `request.organizationId`, the handler responds `403` with `error.code` `TENANT_MISMATCH` (ENT-01, AC 42, door 3)
Proof: `pnpm --filter @app/server exec vitest run src/routes/internal/billing/__tests__/get-entitlements.spec.ts -t "403 TENANT_MISMATCH when path org differs from HMAC"`

**C43** - `rg "from ['\\\"]@repo/db" apps/server/src/routes/internal/billing` prints zero matching lines (ENT-01, AC 43, door 3)
Proof: `node --test --test-name-pattern "internal billing routes have no @repo/db import" scripts/phase-5-isolation.test.mjs`

**C44** - `apps/chat-worker/src/messaging/baileys-manager.ts` does not import `@repo/core` and does not import `@repo/db` (ENT-01, AC 44, door 3)
Proof: `node --test --test-name-pattern "baileys-manager has no @repo/core or @repo/db import" scripts/phase-5-isolation.test.mjs`

**C45** - `getChannelLimitForOrg` fetches with `AbortSignal.timeout(3000)` and HMAC headers `X-Signature`, `X-Timestamp`, `X-Tenant-Id` (ENT-01, AC 45, door 3)
Proof: `pnpm --filter @app/chat-worker exec vitest run src/messaging/baileys-manager.spec.ts -t "entitlements fetch uses 3000ms abort and HMAC headers"`

**C46** - when that fetch rejects, times out, or returns a non-OK status, `connectChannel` rejects and the channel is not in the in-memory map (ENT-01, AC 46, door 3)
Proof: `pnpm --filter @app/chat-worker exec vitest run src/messaging/baileys-manager.spec.ts -t "connectChannel rejects when entitlements fetch fails"`

**C47** - when entitlements `maxChannels` is `null`, the effective limit is `10` (`CHAT_LIMITS.MAX_BAILEYS_CHANNELS_PER_ORG`) (ENT-01, AC 47, door 3)
Proof: `pnpm --filter @app/chat-worker exec vitest run src/messaging/baileys-manager.spec.ts -t "null maxChannels effective limit is 10"`

**C48** - when entitlements `maxChannels` is `3`, the effective limit is `3` (ENT-01, AC 48, door 3)
Proof: `pnpm --filter @app/chat-worker exec vitest run src/messaging/baileys-manager.spec.ts -t "maxChannels 3 effective limit is 3"`

**C49** - `subscriptionCacheKey` still uses prefix `sub:` from `@repo/shared` (`SUBSCRIPTION_CACHE_PREFIX` is `'sub:'`) (ENT-01, AC 49)
Proof: `node --test --test-name-pattern "subscription cache prefix stays sub:" scripts/phase-5-isolation.test.mjs`

**C50** - `apps/server/src/app.ts` registers the entitlements route inside the `internalApp` that already adds `internalAuthMiddleware` then `createInternalRateLimitHook` (ENT-01, Surface 401/429, door 3)
Proof: `node --test --test-name-pattern "entitlements route mounted behind HMAC and internal rate limit" scripts/phase-5-isolation.test.mjs`

**C51** - `internalAuthMiddleware` still responds `401` when `x-signature` is missing (ENT-01, Surface 401)
Proof: `pnpm --filter @app/server exec vitest run src/middlewares/__tests__/internal-auth-middleware.spec.ts -t "returns 401 when x-signature header is missing"`

**C52** - internal rate limit still responds `429` with `Retry-After` (ENT-01, Surface 429)
Proof: `pnpm --filter @app/server exec vitest run src/middlewares/__tests__/internal-rate-limit.spec.ts -t "returns 429 with Retry-After header and structured error body"`

### S6 - AI usage via ERP queue (T5.2) · ~12 files · ~40k

**C53** - the ERP worker consumes BullMQ queue name `erp-record-ai-usage` (USAGE-01, AC 50, door 4)
Proof: `node --test --test-name-pattern "worker consumes erp-record-ai-usage" scripts/phase-5-isolation.test.mjs`

**C54** - the chat-worker usage adapter enqueues to `erp-record-ai-usage` and does not import `@repo/core` or `@repo/db` (USAGE-01, AC 51, door 4)
Proof: `node --test --test-name-pattern "record-ai-usage-adapter enqueues erp-record-ai-usage without core or db" scripts/phase-5-isolation.test.mjs`

**C55** - when enqueue throws, the adapter does not rethrow (USAGE-01, AC 52, door 4)
Proof: `pnpm --filter @app/chat-worker exec vitest run src/ai/record-ai-usage-adapter.spec.ts -t "swallows enqueue errors"`

**C56** - when the worker job has a non-empty `messageIdHash` and a row already exists with that `organizationId` and `messageIdHash`, it does not call `RecordAiUsage.execute` (USAGE-01, AC 53, door 4)
Proof: `pnpm --filter @app/worker exec vitest run src/processors/__tests__/record-ai-usage-processor.spec.ts -t "skips RecordAiUsage when messageIdHash already stored"`

**C57** - when the worker job `messageIdHash` is missing or `null`, it calls `RecordAiUsage.execute` once (USAGE-01, AC 54, door 4)
Proof: `pnpm --filter @app/worker exec vitest run src/processors/__tests__/record-ai-usage-processor.spec.ts -t "calls RecordAiUsage once when messageIdHash is missing"`

**C58** - `apps/chat-worker/package.json` `dependencies` does not list `@repo/core` or `@repo/db` (USAGE-01, AC 55, door 4)
Proof: `node --test --test-name-pattern "chat-worker package.json has no @repo/core or @repo/db" scripts/phase-5-isolation.test.mjs`

**C59** - `apps/chat-worker/tsup.config.ts` `noExternal` array does not contain `'@repo/core'` or `'@repo/db'` (USAGE-01, AC 56, door 4)
Proof: `node --test --test-name-pattern "chat-worker tsup noExternal drops core and db" scripts/phase-5-isolation.test.mjs`

**C60** - `apps/chat-worker/src/tools/capture-lead.ts` and `apps/chat-worker/src/processors/ai-bot-processor.ts` import `ContactSource` from `@repo/shared` and do not import `@repo/db` (USAGE-01, AC 57, door 4)
Proof: `node --test --test-name-pattern "chat-worker ContactSource comes from @repo/shared not @repo/db" scripts/phase-5-isolation.test.mjs`

**C61** - `@repo/shared` `ContactSource` union is `'MANUAL' | 'CHAT_WHATSAPP' | 'CHAT_WIDGET' | 'FORM_WEB' | 'IMPORT' | 'REFERRAL'` (USAGE-01, AC 58, door 4)
Proof: `pnpm --filter @repo/shared exec vitest run src/contact-source.spec.ts -t "ContactSource union has the six Prisma enum values"`

## Coverage

| Set (size) | Member -> proof | Unproven |
| --- | --- | --- |
| Landing doors (4) | money kernel C1, C6, C8, C9 · CreateCommissionForPolicy C12, C16 · HMAC entitlements C39, C44 · `erp-record-ai-usage` C53, C58 | - |
| money rounding (4) | 1500 bp → 15000 C2 · 0 bp C3 · 10000 bp C4 · `0.285` → `28` C5 | - |
| CreateCommissionForPolicy branches (5) | rate 0 C14 · rate `-100` C15 · first save C16 · second same `policyId` C16 · reversal ignored C17 | - |
| S9 claim responses (3) | missing client C29 · no ACTIVE policy C30 · created URGENT C31 | - |
| phoneOrDocument lookup (3) | 11-digit `documentHash` C32 · 14-digit `documentHash` C32 · raw phone C33 | - |
| `GET /api/internal/billing/entitlements/:organizationId` statuses (4) | 200 C40 · 401 C51 · 403 C42 · 429 C52 | - |
| baileys entitlements outcomes (4) | 3000ms abort C45 · fetch fail rejects C46 · `maxChannels` null → 10 C47 · `maxChannels` 3 → 3 C48 | - |
| AI usage write paths (4) | enqueue C54 · swallow C55 · skip duplicate hash C56 · missing hash inserts C57 | - |
| ContactSource union (6) | table-driven over all 6 C61 | - |
| frozen operationId + method + URL (3) | `issuePolicy` C20 · `createInternalClaim` C36 · `getInternalEntitlements` C39 | - |
| startup config: HMAC entitlements mount (2 assemblies) | `app.ts` internalApp C50 · chat-worker fetch C45 | - |

- Claims naming a status code, route or response shape: C37, C40, C41, C42, C51, C52 — each has a proof that crosses the HTTP boundary (C51/C52 at the middleware that the new route mounts behind; C50 joins the mount)
- No other check claims more than the single case its proof exercises

## Test policy

The repo says where tests live (`*.spec.ts`, `*.db.spec.ts`, `pnpm --filter … exec vitest run`) and how they are built (fakes vs Postgres harness). It does not say which level proves a decision table, or how many members of that table must be asserted. These rows apply to this feature only unless copied into guidelines.

| Code | Required proofs | Coverage expectation |
| --- | --- | --- |
| Decides, reached across a boundary | one at the boundary **and** one at its own layer | the contract at the boundary; one asserted case per row of the decision table at its own layer |
| Decides, not reached across a boundary | one at its own layer | one asserted case per row of the decision table |
| Entry point that decides nothing | one at the boundary | accepted input, each rejected input, each error path |
| Instrumentation, pass-throughs | none of its own | covered by its consumer's proof |

Evidence:

- `packages/core/src/shared-kernel/money.ts`: rounding table (1500 / 0 / 10000 / `0.285`) — 4 rows → decides. Analogue: `commission.spec.ts` calculated value. Required: C2–C5 at own layer
- `create-commission-for-policy.ts`: 5 branches (0, negative, first, idempotent, reversal) → decides. Analogue: `on-policy-issued.spec.ts` (2 skip cases). Required: C14–C17 at own layer; IssuePolicy consumer C18
- `register-claim-from-chat.ts`: missing client / no policy / create + document vs phone + latest endDate — 6 branch points → decides. Analogue: `capture-lead.spec.ts`. Required: C29–C34 at own layer; HTTP 400 C37 at the boundary
- `get-entitlements.ts`: tenant match vs mismatch vs empty subscription — 3 branches → decides, reached across HTTP. Required: C40–C42 at the boundary; `GetEntitlementsForOrg` already proven in its spec
- `baileys-manager.ts` channel cap: null vs number vs fetch fail — decides. Required: C45–C48 at own layer
- `record-ai-usage-processor.ts`: skip vs insert on `messageIdHash` — decides. Required: C56, C57
- HMAC `forTenant` extension: instrumentation. Covered by C35 and consumer route
- Template `git mv`: instrumentation. Covered by C21–C27 file proofs

Cost: ~20 own-layer proofs across the six slices. Without these rows, S9 `dataSaved`, commission idempotency, and baileys fail-closed would be proven only by a path that happens to traverse them.

These rows stay in this file. They are not written into repo guidelines unless you say so.

## Swept

- validation: C32, C33, C37 - 11/14-digit document vs phone; claims Zod `400` without `description`
- failure modes: C14, C15, C29, C30, C46 - rate `<= 0` skips; S9 `dataSaved` when nothing persisted; entitlements fetch fail rejects connect
- idempotency: C16, C56 - same `policyId` one non-reversal commission; AI usage skip on `messageIdHash`
- authorization: existing - HMAC `internalAuthMiddleware` + rate limit; C50 mount; C51 `401`; C52 `429`; C42 `TENANT_MISMATCH`
- concurrency: n/a - no unique index on `commission.policyId` or AI `messageIdHash` this phase (application-level skip only)
- data lifecycle: n/a - no stored-data shape change, nothing to backfill
- dependency failure: C46, C55 - entitlements HTTP down fails connect; AI enqueue throw swallowed
- state transitions: C18, C31 - issuance still creates `ACTIVE` then commission; chat claim forces `URGENT`
- observability: n/a - no new metric; existing pino on baileys and usage adapter stays

## Handoff

Intended split, with the arithmetic, written before any code:

- S1+S2+S3 ≈ 70k — money kernel, commission handoff, template moves. One builder
- S4+S5+S6 ≈ 125k — RegisterClaimFromChat, entitlements HMAC, AI queue. Hand off after S3 if the running estimate for the remainder would exceed 150k with unread context; never split a slice
