# Domain Analysis — Bens Seguros (as-is)

> **Date:** 2026-09-13 · **Snapshot:** `main` @ `833fff33` · **Method:** DDD strategic design (skill `domain-analysis`), read-only code analysis
>
> **Scope:** describes what the system *currently represents*. It intentionally **does not propose a target architecture** — that is a follow-up step. Findings marked "S#"/"D#" reference code at the snapshot above and may drift.

**One-line summary:** a multi-tenant ERP for Brazilian insurance brokers (*corretoras*) covering the sales pipeline (lead → proposal → issued policy), post-sale servicing (claims, assistance, endorsements, renewals), salesperson commissions, and a multi-channel conversational front-door (WhatsApp/IG/Messenger/widget + AI bot) that feeds leads into the pipeline — wrapped in a SaaS layer (subscriptions, plans, entitlements).

---

## 1. Business capabilities

| # | Capability | Subdomain type | Where it lives |
|---|---|---|---|
| C1 | **Sales pipeline** (lead → quote → protocol → inspection → payment → issued) | **Core** | `core/proposal`, `contact`, `client` (promotion) |
| C2 | **Policy portfolio** (issue, cancel, expire, renew, endorse) | **Core** | `core/policy`, `endorsement`, worker `expire-policies` |
| C3 | **Commissions** (calc, 2-step approval, pay, reversal) | **Core / Supporting** | `core/commission` |
| C4 | **Post-sale servicing** (claims, claim occurrences, assistance) | Supporting | `core/claim`, `occurrence`, `assistance` |
| C5 | **Conversational acquisition** (WhatsApp/IG/Messenger/widget, AI bot, human handoff) | **Core** (differentiator) | `chat-server`, `chat-worker`, `db-chat`, `ai` |
| C6 | **Sales performance** (goals, dashboard, alerts) | Supporting | `core/goal`, `dashboard`, worker `alerts/*` |
| C7 | **Insurer catalog & quoting integrations** | Supporting | `core/insurer`, `vehicle-lookup`, `cep`, `packages/aggilizador` |
| C8 | **Documents** (upload, storage, typed attachments) | Supporting | `core/document` |
| C9 | **Tenancy & team** (org, members, roles, invitations) | Generic+ | `core/organization`, `member`, `invitation`, `auth` |
| C10 | **Identity & compliance** (auth, 2FA, terms, LGPD, audit) | Generic (LGPD specifics) | Better Auth, `core/audit`, `client/lgpd-delete` |
| C11 | **SaaS billing** (plans, subscription, invoices, dunning, AI overage) | Generic | `core/subscription`, `ai-usage`, `billing-port`, `asaas-adapter`, worker |
| C12 | **Notifications** (in-app + email) | Generic | `core/notification`, worker `notification-processor` |
| C13 | **Global search, CSV import/export** | Generic | `core/search`, `*-csv`, worker `csv-import` |

---

## 2. Actors

| Actor | Role in domain | Evidence |
|---|---|---|
| **OWNER / ADMIN** | Runs brokerage, admin-approves commissions, LGPD delete, team mgmt | `packages/auth/src/abilities.ts` |
| **MANAGER** | Ops supervision, approves commissions, receives alerts | abilities + `alerts/*` (notify MANAGER/ADMIN/OWNER) |
| **COMMERCIAL** (*vendedor*, "salesperson") | Owns contacts/proposals/policies; commercial-approves commissions | `salespersonId` on 5 models |
| **VIEWER** | Read-only (no insurers) | abilities |
| **Super admin** | Platform operator (billing, trials) | `User.isSuperAdmin`, `require-super-admin-2fa` |
| **End customer / insured** | Chats in, receives quotes, is the `Client` | chat contact, `SendQuote` email |
| **AI bot** | Qualifies leads, creates proposals, searches clients, escalates | `chat-worker/tools/*` |
| **Human chat agent** | Assigns/transfers/closes conversations (a `User`) | `ConversationEntity.assign/transfer` |
| **Insurer** (*seguradora*) | External; only catalog data, not a system actor | `Insurer` model |
| **External systems** | Asaas (billing), Meta/Baileys (messaging), Resend (email), R2 (storage), ViaCEP, plate lookup, Aggilizador/FIPE | adapters |
| **Scheduler** | Expire policies/subscriptions, alerts, dunning, audit archive | `apps/worker/processors` |

---

## 3. Domain concepts — entities, value objects, business rules

### 3.1 Sales pipeline (C1)

**Ubiquitous language:** Contato, Lead, Cliente, Proposta, Cotação, Etapa (Captação → Cotação → Protocolo → Vistoria → Pagamento → Apólice Emitida / Perdida), Quadro (Novo seguro / Renovação / Endosso), Ramo (Auto, Residencial, Condomínio, Empresarial, Vida), Checklist, Bem segurado.

| Concept | Kind | Notes |
|---|---|---|
| `Contact` | Entity (rich) | Person/lead identified by phone; `source` (MANUAL, CHAT_WHATSAPP, WIDGET, FORM, IMPORT, REFERRAL); owner `salespersonId`; `consentLgpd`; optional `clientId` |
| `Client` | Entity (anemic, repo + presenter) | Legal insured; CPF/CNPJ encrypted + `documentHash` for dedup; address, profession, marital status, `fiscalBirthDate` |
| `Proposal` | **Aggregate root** (rich, 369 lines) | Stage machine, board type, branch, premium, commission rate, insured-object details, quote dates, lost reason, renewal/endorsement links, `sourcePolicySnapshot` |
| `ProposalChecklistItem` | Entity inside Proposal aggregate (separate repo) | `itemKey`, required/optional, completed by user or auto |
| `InsuredObjectDetails` | Value object (discriminated by `branch`) | Schema in `@repo/shared/insured-object-details-schema` (shared with AI tool) |
| `SourcePolicySnapshot` | Value object | Frozen policy view when creating an endorsement proposal |
| `ChecklistConfig` | Domain policy (static table) | Base items per stage + extras per branch |
| Stage / BoardType / Branch | Enumerated VOs | — |
| Money (cents), rates (basis points) | Implicit VOs | Primitive `number`s, untyped |

**Business rules found**

- Linear stage progression only (`Proposal.advance`); no backward move except LOST → reopen.
- ENDORSEMENT proposals **start at QUOTE**; others at CAPTURE; reopen resets to initial stage.
- Cannot leave QUOTE without `details`.
- Any stage ≠ CAPTURE requires required checklist items complete to advance.
- Leaving PAYMENT requires the **contact promoted to client**.
- Cannot mark LOST when POLICY_ISSUED or already LOST.
- `details.branch` must equal `proposal.branch`.
- Coverage end > start.
- Quote validity defaults to **15 days** (hardcoded in `CreateProposal`).
- Endorsement requires an ACTIVE source policy; contact = **oldest contact linked to that client**.
- Renewal resolves the prior policy by `renewalPolicyNumber`.
- Send quote requires client email and non-LOST proposal.
- Promotion (`PromoteContact`): dedup client by `documentHash`; reject if already linked to a client with a different document; triggers checklist auto-completion.
- Checklist auto-completion: `client_data` (contact has client), `driver_license`/`vehicle_registration` (document of that type attached).
- Branch-specific requirements: LIFE → health declaration; RESIDENTIAL → proof of address; BUSINESS → social contract + CNPJ card; AUTO → CNH, CRLV, photos, inspection report.
- Proposal "stagnant" after **15 days** without update (alert).

### 3.2 Policy portfolio (C2)

**Language:** Apólice, Vigência, Prêmio, Cancelamento, Vencimento, Renovação, Endosso, Coberturas.

| Concept | Kind | Notes |
|---|---|---|
| `Policy` | Entity (anemic — `PolicyData` + repo) | 1:1 with Proposal (`proposalId @unique`), Client, Insurer, salesperson; status ACTIVE/CANCELLED/EXPIRED |
| `CoverageDetails` | Untyped JSON | — |
| `Endorsement` | Entity (anemic CRUD) | `previousVersionSnapshot` + `changes` JSON, `effectiveDate` |
| Policy PDF | Derived artifact | `EnsurePolicyPdf`, `PolicyPdfRenderer` port |

**Rules**

- Issue only from a proposal at POLICY_ISSUED, with an insurer, a promoted contact, and a client address.
- Policy number unique per org.
- Issuing **creates a commission** synchronously (`OnPolicyIssued`) if rate > 0.
- Cannot cancel twice.
- Daily 02:00 job: ACTIVE with past `endDate` → EXPIRED.
- Expiry alerts at 30/15/7 days (CRITICAL ≤ 7).

### 3.3 Commissions (C3)

**Language:** Comissão, Split, Aprovação comercial, Aprovação administrativa, Pagamento, Estorno, Rejeição.

| Concept | Kind | Notes |
|---|---|---|
| `Commission` | **Aggregate root** (rich) | Status: PENDING_COMMERCIAL → PENDING_ADMIN → APPROVED → PAID → REVERSED; REJECTED from either pending |
| Reversal commission | Same entity, `isReversal` | Negative value, `originalCommissionId`, restarts approval cycle |
| `calculateCommissionValue` | Domain service | premium × rate(bp) × split(bp) |

**Rules:** two-step approval; only PAID can be reversed (atomic `reverseAtomic`); rejection requires a reason and is terminal; split defaults to 10000 bp (100%); salesperson notified (in-app + email) on approve/reject.

### 3.4 Post-sale servicing (C4)

**Language:** Sinistro, Ocorrência, Assistência (guincho etc.), Prioridade, Vistoria, Prestador.

| Concept | Kind | Notes |
|---|---|---|
| `Claim` | Entity (anemic) | Sequential `claimNumber` per org, status machine, priority, estimated value, incident data, assignee |
| `Occurrence` | Entity (append-only) | Timeline events on a claim (`type`, `metadata`) |
| `Assistance` | Entity (anemic) | Linked to Policy, Client, optional Claim; provider, geolocation, schedule |

**Rules**

- Claim state machine lives in use case `UpdateClaimStatus` (not an entity): REGISTERED → IN_ANALYSIS ⇄ AWAITING_DOCUMENT; IN_ANALYSIS → PENDING_INSPECTION / APPROVED / REJECTED; APPROVED → PAID → COMPLETED.
- `resolvedAt` on APPROVED/REJECTED; `closedAt` on COMPLETED.
- New claim notifies OWNER/ADMIN/MANAGER.
- Chat-originated claims are **URGENT**, attached to the client's latest-ending active policy.
- "Claim stalled" alert.

### 3.5 Conversational acquisition (C5) — separate world (MongoDB)

**Language:** Conversa, Canal, Mensagem, Contato (chat), Agente de IA, Fila, Atendente, Transferir, Voltar para IA, Broker.

| Concept | Kind | Notes |
|---|---|---|
| `Conversation` | Aggregate (rich `ConversationEntity`) | BOT_ACTIVE ⇄ WAITING_HUMAN ⇄ HUMAN_ACTIVE → CLOSED |
| `Message` | Entity | senderType CLIENT/AGENT/BOT/SYSTEM, delivery status, media, `externalId` dedup |
| `Channel` | Entity | type (WhatsApp/IG/Messenger/widget), broker (BAILEYS/META…), connection status, `aiAgentId` |
| `AiAgent` | Entity (config) | system prompt, provider, temperature, response cap, `enabledTools` |
| Chat `Contact` | Entity (Mongo) | Identified by `whatsappPhone`/`facebookId`/`instagramId`; `pgContactId`, `clientId` |
| `UnreadCount`, `BaileysAuthState` | Infra-ish | — |
| AI tools | Application services | `captureLead`, `collectInsuredAssetData`, `searchClient`, `listProducts`, `escalateToHuman` |

**Rules:** new conversation → BOT_ACTIVE if channel has AI else WAITING_HUMAN; assign only from WAITING_HUMAN; transfer/return-to-queue only HUMAN_ACTIVE; return-to-bot from human states; lead capture → transfer to human; client close command (confirmation text); auto-close of idle conversations; AI max responses per conversation; message rate limits.

### 3.6 Sales performance (C6)

- `Goal`: (year, month, boardType) → `targetPremiumCents`; only NEW_INSURANCE and RENEWAL.
- `DashboardSnapshot`: read model over proposals, policies, claims, commissions with period comparison.
- **Rule:** "realized premium" = Σ `Policy.premiumValueInCents` by month of policy **`startDate`**, grouped by the proposal's `boardType` (`prisma-dashboard-repository.ts:95-114`).
- **Alerts:** policy expiring, claim stalled, commission pending, proposal stagnant — with idempotency check.

### 3.7 Tenancy, identity, compliance, billing (C9–C11)

- `Organization` (slug, logo, `billingManagedExternally`), `Member` (role, active, `commissionSplitPercentage`), `Invitation` (7-day TTL; caller role must outrank target role — `assertCanManageRole`).
- `User`, `Session`, `Account`, `TwoFactor`, `Verification` (Better Auth); `TermsAcceptance` (versioned terms/privacy consent).
- `AuditLog` + `AuditLogArchive`; LGPD anonymization nulls audit `before/after` for the client.
- `Plan` (global catalog: quotas + feature flags), `Subscription` (TRIALING/ACTIVE/PAST_DUE/CANCELED/EXPIRED/BILLED_EXTERNALLY), `Invoice` (base + overage items), `PaymentMethod` (encrypted provider token), `WebhookEvent` (dedup).
- `Entitlements` — projection produced by billing, consumed by auth/CASL (`cannot` overlays on roles).
- `AiUsageRecord` — token/cost metering per period, hashed chat IDs.
- **Access rules:** PAST_DUE/EXPIRED → HTTP 402; CANCELED keeps access until period end; expired trial blocked; billing/auth/webhooks exempt.

---

## 4. Key workflows

```
W1  Lead to Policy (core flow)
    [Chat] inbound msg → chat Contact upsert → Conversation (BOT_ACTIVE)
      → AI captureLead ──HMAC──▶ server /internal/leads
           → dedupe PG Contact by phone → CreateContact (salesperson = oldest active member)
           → CreateProposal(NEW_INSURANCE, CAPTURE) + checklist + auto-detect
      → AI collectInsuredAssetData ──▶ /internal/proposals/:id/details (premium=0, commission=0)
      → conversation → WAITING_HUMAN
    [ERP] Salesperson: details/premium/insurer → advance QUOTE → SendQuote (PDF + email via worker)
      → checklist ✓ → PROTOCOL → INSPECTION → PAYMENT (requires PromoteContact → Client)
      → POLICY_ISSUED (stage) → IssuePolicy (separate manual POST) → Policy ACTIVE
      → OnPolicyIssued → Commission PENDING_COMMERCIAL → PDF generated async

W2  Commission lifecycle
    PENDING_COMMERCIAL → (commercial approve) → PENDING_ADMIN → (admin approve) → APPROVED → PAID
                     ↘ REJECTED ↙                     PAID → ReverseCommission → REVERSED + new negative commission

W3  Renewal:     policy nearing expiry (alert 30/15/7) → RENEWAL proposal (renewalPolicyId/Number) → W1 from CAPTURE → new Policy
W4  Endorsement: ACTIVE policy → ENDORSEMENT proposal (snapshot, starts QUOTE) → … → IssuePolicy
                 (separately: Endorsement CRUD record on the policy)
W5  Claim:       chat (/internal/claims, URGENT) or ERP → Claim REGISTERED → status machine → Occurrences → optional Assistance
W6  Expiry:      daily job ACTIVE→EXPIRED
W7  Onboarding:  signup (turnstile/tempmail gates) → org + trial subscription → invitations → members
W8  Billing:     Asaas webhook → WebhookEvent dedup → canonical event → invoice upsert + subscription status → cache invalidation → 402 gate
W9  Import:      CSV → worker → Client create / synthetic Proposal(POLICY_ISSUED) + Policy
W10 LGPD:        lgpd-delete client → anonymize Client row + blank its audit snapshots
```

---

## 5. Relationships between concepts

```
Organization ─┬─ Member ── User ── (salesperson of) Contact, Proposal, Policy, Commission; (assignee of) Claim
              ├─ Invitation
              ├─ Subscription ── Plan ; Invoice ; PaymentMethod
              └─ Insurer (per-tenant catalog)

Contact ──(0..1)── Client                  Mongo chat Contact ··pgContactId··▶ PG Contact (weak, one-way)
   │                  │
Proposal ─────────(1:1)─ Policy ─┬─ Commission (─ reversal ─▶ Commission)
   │  ├ renewalPolicy ─▶ Policy   ├─ Claim ── Occurrence
   │  ├ sourcePolicy  ─▶ Policy   │    └── Assistance
   │  └ ChecklistItem             ├─ Assistance
   └─ Insurer                     └─ Endorsement

Document ──(entityType, entityId)──▶ CLIENT | PROPOSAL | POLICY | CLAIM | ASSISTANCE   (polymorphic, no FK)
Notification / AuditLog ──(entityType string, entityId)──▶ anything
```

**Identity anchors:** Proposal is anchored on **Contact**; Policy/Claim/Assistance on **Client**; Commission on **Policy** (+ nullable `clientId` never populated by `Commission.create`).

---

## 6. Areas of high business complexity

| Rank | Area | Why |
|---|---|---|
| 1 | **Proposal pipeline + checklist** | Stage machine × board type × branch × checklist config × auto-detection from documents/promotion × promotion gate × quote validity. Logic spread across `Proposal`, `AdvanceProposalStage`, `CreateProposal`, `AutoCompleteChecklistItems`, `PromoteContact`, `UploadDocument` |
| 2 | **Chat ↔ ERP lead conversion** | Two databases, three "contact" notions, HMAC calls, AI tool ordering (`captureLead` before `collectInsuredAssetData`), human handoff |
| 3 | **Renewal / endorsement semantics** | Three representations (board type, renewal/source links, Endorsement record), none updates the original policy |
| 4 | **Commission money flow** | Basis-point math, split, 2-step approval, reversal as new record |
| 5 | **Claims** | 8-state machine, priorities, occurrences, assistance, insurer link |
| 6 | **Entitlements / subscription gating** | Status × trial × external billing × plan flags → CASL |
| 7 | **Multi-channel messaging** | 5 brokers, OAuth/QR connection lifecycle (mostly infra, but channel state rules are real) |

---

## 7. Infrastructure concerns (not domain)

- Messaging brokers: Baileys session management, QR state, Meta OAuth/embedded signup, Instagram/Messenger brokers, media migration.
- `StorageProvider` (R2/local), PDF rendering (`react-policy-pdf-renderer`), email provider (Resend) & HTML templates.
- Redis pub/sub, Socket.IO namespaces, presence, rate limiters, BullMQ queues/schedulers, Bull Board.
- RLS / `prisma` vs `prismaAdmin`, tenant middleware, HMAC internal auth, turnstile/tempmail/signup gates, security headers, Sentry PII scrubbing, pino redaction.
- ViaCEP, plate lookup, FIPE/Aggilizador HTTP clients, cache-aside.
- `billing-port` (canonical events) + `asaas-adapter`, webhook dedup.
- CSV parsing/export, cursor pagination, crypto (document encryption/hash).

---

## 8. Current implicit modules (as actually wired)

| Implicit module | Physical pieces | Coherent? |
|---|---|---|
| **Sales** | `proposal`, `contact`, part of `client` (promotion), `document` (auto-complete trigger), `vehicle-lookup`, `insurer` | Linguistically yes; physically spread across 4+ modules |
| **Portfolio** | `policy`, `endorsement`, worker expire/alerts, CSV import processor | Partial — import/expiry rules live outside core |
| **Commissioning** | `commission` (+ `member` for recipient, `notification` templates) | Yes |
| **Servicing** | `claim`, `occurrence`, `assistance`, internal `create-claim` route | Language yes; state machine in use case, chat intake logic in route |
| **Conversations** | `chat-server` (entity + use cases) **and** `chat-worker` (direct Mongoose helpers) | Split across two apps with parallel implementations |
| **Performance** | `goal`, `dashboard`, worker `alerts` | Yes, but goal↔dashboard mutual import |
| **Workspace** | `organization`, `member`, `invitation`, `auth` roles | Yes |
| **Platform billing** | `subscription`, `ai-usage`, `billing-port`, `asaas-adapter`, 4 worker processors, `auth/entitlements` | Yes |
| **Cross-cutting** | `notification`, `audit`, `search`, `cep` | Generic |

---

## 9. Duplicated business responsibilities

| # | Duplication | Evidence |
|---|---|---|
| D1 | **Three "Contact" models**: Mongo chat contact (phone/social IDs), PG `Contact` (lead), PG `Client` (insured). Link is one-way `pgContactId`, set only by `captureLead` tool; Mongo `clientId` read but never set | `db-chat/models/contact.model.ts`, `capture-lead.ts:121-127` |
| D2 | **Contact dedup by phone** done in internal `create-lead` route via Prisma, not in `CreateContact` | `internal/leads/create-lead.ts:53-77` |
| D3 | **Checklist regeneration + auto-detection loop** copy-pasted | `create-proposal.ts:87-107`, `advance-proposal-stage.ts:91-111` |
| D4 | **Policy creation** exists twice: `IssuePolicy` (rules, commission) vs CSV import worker (raw `prismaAdmin`, synthetic POLICY_ISSUED proposal, no commission, no address check) | `csv-import-processor.ts:223-248` |
| D5 | **Conversation state transitions**: `ConversationEntity` in chat-server, but chat-worker has `close-conversation-helper`, `transfer-to-human-helper`, `findOrCreateConversationAtomic` operating on Mongo directly | `chat-worker/processors/*-helper.ts` |
| D6 | **Endorsement**: ENDORSEMENT-board proposals (with snapshot) vs standalone `Endorsement` entity (`previousVersionSnapshot`/`changes`) — never connected | `CreateEndorsement` used only by its own route |
| D7 | **Insurance product/branch vocabulary**: Prisma `InsuranceBranch`, `Proposal` literal types, `create-lead` map (TRAVEL→OTHER), hardcoded `PRODUCTS` catalog in chat-worker (includes TRAVEL), Aggilizador enums | `list-products.ts`, `create-lead.ts:17-25` |
| D8 | **`billingManagedExternally`** on Organization and Subscription (acknowledged mirror) | schema |
| D9 | **Denormalized `clientId`/`insurerId`** on Claim, Assistance, Commission alongside Policy | schema |
| D10 | **"Send quote"**: `SendQuote` only validates; actual send + `sentToClientAt` update in worker via raw Prisma; `quote_sent` checklist item is separate/manual | `send-quote.ts`, `send-quote-email-processor.ts` |
| D11 | **Role lists for notification recipients** hardcoded in multiple places (`CreateClaim` NOTIFY_ROLES, each alert processor) | — |

---

## 10. Suspicious responsibilities / likely rule gaps

Each item is observed in code; flagged for validation (some may be intentional).

| # | Observation | Location |
|---|---|---|
| S1 | **Issuing a policy ignores `boardType`**: an ENDORSEMENT proposal creates a brand-new `Policy` (new number) instead of altering the source; RENEWAL does not mark the old policy renewed | `issue-policy.ts` (no boardType branch) |
| S2 | **Cancelling a policy has no effect on commissions** (no reversal / rejection of pending) | `cancel-policy.ts` |
| S3 | **`Member.commissionSplitPercentage` is never read**; commissions always use 100% split | grep: only schema |
| S4 | **`Proposal.commissionPercentageInCents` actually holds basis points** (`updateDetails(…, commissionBasisPoints)`, mapped to `commissionPercentageInBasisPoints`) | `proposal.ts:217`, `issue-policy.ts:92` |
| S5 | **Checklist config references document type `INSPECTION_REPORT`, not in `DocumentType` enum** — can never match | `checklist-config.ts:85` vs schema |
| S6 | **PROTOCOL/INSPECTION stages apply to every branch** (e.g. LIFE still requires `inspection_done`); label hardcodes a vendor ("Broker/Qualex") | `checklist-config.ts` |
| S7 | **POLICY_ISSUED stage can exist without a Policy** — stage and issuance are independent manual steps | `advance` vs `POST /policies` |
| S8 | **Business logic in internal routes**: lead salesperson = *oldest active member* (usually OWNER); chat claims forced URGENT; policy selection by latest `endDate` | `internal/leads/create-lead.ts`, `create-claim.ts` |
| S9 | **Internal `create-claim` returns `dataSaved: true` / "Dados registrados para o corretor" without persisting anything** when client/policy not found | `create-claim.ts:57-107` |
| S10 | **Plan quotas (`maxUsers`, `maxProposalsPerMonth`, `maxChannels`, `maxImportRows`, …) are not enforced** in server/worker/chat/core — only exposed in billing schemas/UI. Only status gating + feature flags apply | grep results |
| S11 | **`@repo/aggilizador` has no consumers** in `apps/*` or `packages/core` (CLAUDE.md states `apps/server` uses it) | grep: zero hits |
| S12 | **LGPD delete only anonymizes `Client` + its audit rows**; linked `Contact` (name/phone/email), Mongo chat contact/messages, documents, and denormalized names in snapshots (`sourcePolicySnapshot.clientName`) are untouched | `prisma-client-repository.ts:229-250` |
| S13 | **COMMERCIAL has `approve` on Commission** and `approveByCommercial(_userId)` ignores the user — a salesperson may approve their own commission (route-level ownership check not verified) | `abilities.ts`, `commission.ts:84` |
| S14 | **Chat leads created with `consentLgpd: true` hardcoded** | `create-lead.ts:73` |
| S15 | **AI sets premium & commission to 0** when writing details, overwriting any human-entered values | `collect-insured-asset-data.ts:38-42` |
| S16 | **Imported policies always count as NEW_INSURANCE** in goals (synthetic proposal); realized premium booked by policy `startDate` | csv import + dashboard query |
| S17 | **Commission/claim use cases import email templates from notification *infrastructure*** and build pt-BR copy/currency formatting | `approve-commission-admin.ts:4`, `reject-commission.ts`, `create-claim.ts` |
| S18 | **`Commission.clientId` never set** by domain | `commission.ts` create |
| S19 | **Notification `type`/`entityType` are free strings**; canonical list only in a schema comment | `schema.prisma:651` |
| S20 | **Alert copy lacks diacritics** ("Apolice", "estagio", "ha") — violates UI language rule | `check-policy-expiry.ts`, `check-proposals-stagnant.ts` |

---

## 11. Coupling between domain concepts

**Core module dependency graph** (import counts, non-test):

```
policy      → client(4) proposal(2) contact(1) commission(1) document(2) organization(2)   ← hub
proposal    → contact(3) policy(1) document(1)
contact     → client(2) proposal(1)          ┐
document    → proposal(1)                    ├─ cycles: proposal⇄contact, proposal⇄policy,
goal        → dashboard(1)                   │          proposal⇄document, goal⇄dashboard
dashboard   → goal(1)                        ┘
commission  → member(2) notification(4, incl. infra templates)
claim       → member(1) notification(3, incl. infra templates)
invitation  → member(5) notification(1) organization(1)
occurrence  → claim(1) policy(1, only JsonValue type)
endorsement → occurrence(2, only JsonObject type)   ← accidental coupling
organization→ document(3, StorageProvider)
vehicle-lookup → audit(1)
```

**Cohesion assessment** (skill scoring 0–10):

| Grouping | Score | Comment |
|---|---|---|
| Proposal + Checklist + ChecklistConfig | 9 | Tight, one language |
| Proposal ↔ Contact ↔ Client | 6 ⚠️ | Promotion is a genuine business event but implemented as mutual imports |
| Proposal ↔ Policy | 6 ⚠️ | 1:1 "issuance" handoff; `IssuePolicy` reaches into 4 repos + calls commission synchronously |
| Policy ↔ Endorsement | 4 ❌ | Same language, two disconnected models (D6/S1) |
| Commission (internal) | 9 | Rich aggregate |
| Commission ↔ Notification templates | 3 ❌ | Generic presentation inside core use case |
| Claim + Occurrence + Assistance | 7 | Shared language; rules in use cases |
| Goal ↔ Dashboard | 5 ⚠️ | Mutual dependency; goal progress is really a sales-performance query |
| Chat Contact ↔ ERP Contact/Client | 2 ❌ | Weak one-way link, no shared identity rules |
| Chat-server ↔ Chat-worker conversation logic | 4 ❌ | Same aggregate, two implementations |
| Organization ↔ Document(storage) | 3 ❌ | Only shares a technical port |
| Subscription ↔ Auth (via Entitlements) | 8 | Deliberate projection boundary |
| Endorsement ↔ Occurrence | 1 ❌ | Type-only borrowing |

**Linguistic boundaries detected** (same term, different meaning):

- **"Contact"** — chat participant (channel identity) / ERP lead owned by salesperson / (member "contact" = email recipient in `findContactByUserId`).
- **"Salesperson"** — a `User` id on records, but roles/split/active status live on `Member`.
- **"Endorsement"** — a pipeline board type (a *request* to change a policy) vs a record of an applied change.
- **"Issued"** — proposal stage `POLICY_ISSUED` vs existence of a `Policy` row.
- **"Premium"** — proposal estimate (may be 0/AI-set) vs policy premium (booked for goals).
- **"Status" vs "Stage"**; "Protocol" (submission to insurer) not modeled beyond a checklist item.
- **"Assistance"** — product coverage in chat catalog vs operational dispatch record.

---

## 12. Summary snapshot

- **Real core domain:** the *broker's lead → proposal → policy → commission lifecycle*, plus the conversational intake feeding it. Proposal, Commission and Conversation are the only rich aggregates — matching the documented "DDD Full" set.
- **Policy is under-modeled** relative to its centrality: anemic, a coupling hub, and renewal/endorsement semantics are incomplete.
- **Integrity rules leak** into workers (import, expiry, quote sending), internal routes (lead/claim intake) and a second app (chat-worker).
- **Most consequential semantic gaps:** endorsement/renewal issuance (S1), policy cancellation vs commissions (S2), unused split (S3), unenforced quotas (S10), LGPD scope (S12), silent "data saved" claim intake (S9).

**Next step (not in this document):** bounded-context proposal and target architecture, built on this map.
