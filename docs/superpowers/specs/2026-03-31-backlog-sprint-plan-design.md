# Backlog Implementation Design — Bug-First Approach

**Date:** 2026-03-31
**Scope:** 14 Jira cards (SCRUM project) — 4 bugs + 10 features
**Approach:** Bug-First (Abordagem A) — fix blockers, then features by priority

---

## Sprint 1: Bugs + Quick Wins (1-2 days)

### 1. SCRUM-21 — Texto incorreto no checklist do Protocolo

**Type:** Bug (Highest)
**Status:** Confirmed via Playwright test

**Problem:** Checklist item in PROTOCOL stage shows "Proposta protocolada na seguradora". Should be "Proposta protocolada no Broker/Qualex".

**Fix:** Change the string in the checklist item generator in `packages/core/src/modules/proposal/` where stage-specific checklist items are defined.

**Scope:** 1 line change.

---

### 2. SCRUM-45 — Bug na vigencia (date picker nao persiste)

**Type:** Bug (Highest)
**Status:** Partially confirmed via Playwright test

**Problem:** When selecting dates in the "Emitir Apolice" modal's date picker, the selected date does not persist in the field. The field reverts to "Selecione a data".

**Investigation:**

- Check date picker component binding with React Hook Form (value + onChange)
- Possible race condition between popover close and state update
- Verify `setValue` or `field.onChange` is called correctly on date selection

**Fix:** Adjust date picker binding in the policy issuance form. Ensure `onChange` from React Hook Form field is invoked when a date is selected.

**Files:** `apps/web/src/features/proposals/components/` — policy issuance modal and date picker component.

**Scope:** 1-2 files.

---

### 3. SCRUM-40 — Erro ao finalizar proposta pelo Kanban

**Type:** Bug (Highest)
**Status:** Not reproduced via table view (all stages advanced successfully). Bug likely specific to Kanban drag & drop.

**Problem:** When trying to finalize a proposal via Kanban drag, system shows "nao e possivel avancar a partir do estagio".

**Hypotheses:**

1. Kanban drag allows dropping on non-adjacent columns, but `advanceStage` only allows +1 step
2. Drag handler tries to advance when proposal is already at terminal stage (POLICY_ISSUED)
3. Missing validation on which columns accept drops

**Investigation:**

- `apps/web/src/features/proposals/components/proposal-kanban.tsx` — drag end handler
- `packages/core/src/modules/proposal/domain/` — stage transition validation
- `apps/server/src/routes/v1/proposals/` — advance stage route

**Fix:** Validate in Kanban drag handler that drop is only allowed on adjacent column. Show friendly error for invalid drops.

**Scope:** 2-3 files (frontend kanban handler + possibly domain).

---

### 4. SCRUM-28 — Campo "Rede Social" no cadastro de clientes

**Type:** Feature (Highest)

**Problem:** No social media fields exist in client registration.

**Changes:**

- **Schema Prisma:** Add `socialMedia Json?` field to `Client` model
- **Backend:** Add to create/update client Zod schemas, include in mapper
- **Frontend:** Add "Redes Sociais" section in client form with optional inputs for Instagram, Facebook, LinkedIn, TikTok

**Data format:** Flexible JSON field with typed interface:

```typescript
interface SocialMedia {
  instagram?: string
  facebook?: string
  linkedin?: string
  tiktok?: string
}
```

**Scope:** Schema Prisma + server route + frontend form + regenerate Orval.

---

### 5. SCRUM-47 — Campo Seguradora na emissao de apolice

**Type:** Feature (Highest)
**Status:** Confirmed via Playwright test — modal lacks insurer field.

**Problem:** "Emitir Apolice" modal only has: policy number, start date, end date. Missing insurer selection.

**Changes:**

- **Backend:** Verify `insurerId` is accepted in policy creation schema. If not, add to Zod schema.
- **Frontend:** Add required combobox "Seguradora" in issuance modal, fetching from `/api/v1/insurers` endpoint.
- **Pre-requisite:** Insurer CRUD must exist and have data.

**Scope:** 1-2 frontend files (issuance modal) + possible backend schema adjustment.

---

## Sprint 2: Features Proposta/Apolice (2-3 days)

### 6. SCRUM-30 — Datas nas cotacoes

**Type:** Feature (Highest)

**Problem:** Proposals only have `createdAt`/`updatedAt` (system dates). No business dates.

**Changes:**

- **Schema Prisma:** Add to Proposal model:
  - `quoteSentAt DateTime?` — when quote was sent to client
  - `quoteApprovedAt DateTime?` — when client approved
  - `protocoledAt DateTime?` — when protocoled
  - `policyStartDate DateTime?` — desired coverage start
  - `policyEndDate DateTime?` — desired coverage end
- **Backend:** Include in update schemas. Timestamps (sent/approved/protocoled) set automatically when corresponding checklist item is checked.
- **Frontend:** Display dates in proposal detail area. Coverage dates editable in QUOTE stage.

**Design decision:** First 3 dates are **automatic** (set on checklist completion). Coverage dates are **manual** (broker inputs desired dates during quoting).

**Scope:** Schema Prisma + 2-3 backend routes + frontend detail component.

---

### 7. SCRUM-24 — Campos adicionais para ramo Condominio

**Type:** Feature (Highest)

**Problem:** `CondominiumDetails` lacks security and structural fields for proper risk analysis.

**Changes — expand `CondominiumDetails` interface:**

- `hasFireSystem: boolean?` — fire suppression system
- `hasSecurityGuard: boolean?` — 24h security/concierge
- `hasSurveillanceCameras: boolean?` — CCTV
- `hasElevator: boolean?` — elevators
- `elevatorCount: number?` — elevator count
- `constructionType: enum?` — masonry, mixed, wood
- `roofType: enum?` — slab, tile, mixed
- `totalArea: number?` — total area m2
- `garageSpaces: number?` — parking spaces

**Files:**

- `packages/core/src/modules/proposal/domain/insured-object-details.ts`
- `apps/server/src/routes/v1/proposals/_schemas.ts`
- Frontend form for CONDOMINIUM branch

**All new fields are optional** — no breaking changes to existing proposals.

---

### 8. SCRUM-46 — Vinculo automatico de CNPJ (empresa/condominio)

**Type:** Feature (Highest)

**Problem:** When client is PJ (CNPJ), creating a proposal doesn't auto-fill insured object fields with client data.

**Changes:**

- **Frontend only:** When proposal branch is CONDOMINIUM or BUSINESS and client has CNPJ:
  - Auto-fill `condominiumName` / `businessName` with client name
  - Display client CNPJ (read-only) in insured object section
  - Allow editing (broker can adjust)
- **Logic:** On loading proposal details, if branch is CONDOMINIUM/BUSINESS and details are empty, pre-populate from linked client data

**No backend changes needed** — purely frontend pre-fill logic using existing client data.

**Scope:** 1-2 frontend files.

---

### 9. SCRUM-41 — Vinculo de renovacao (exibir dados da apolice)

**Type:** Feature (Medium, in review)

**Problem:** RENEWAL proposals have `previousPolicyId` but don't display the linked policy data (insured, policy number, coverage dates).

**Changes:**

- **Backend:** In get-proposal route, when `boardType === RENEWAL`, include previous policy data via Prisma `include` (policy -> client, startDate, endDate, policyNumber, insurer)
- **Frontend:** New "Apolice Vinculada" card in proposal detail showing:
  - Insured name
  - Previous policy number
  - Previous coverage period (start — end)
  - Insurer (if available)
- **Position:** Above insured object data, visible in all stages

**Scope:** 1 backend route adjustment + 1 new frontend component.

---

## Sprint 3: Features Maiores (3-5 days)

### 10. SCRUM-32 — Atualizacao dinamica de status do sinistro

**Type:** Feature (Medium)

**Problem:** Claim status exists but no UI for transitions or history tracking.

**Changes:**

- **Frontend — Claim detail:**
  - "Atualizar Status" button with dropdown showing valid next statuses
  - Timeline/history of status changes (when, by whom)
- **Backend:** Check if transition log exists. If not, add `statusHistory` JSON array or leverage existing `AuditLog` table.
- **Validation:** Only valid transitions allowed (e.g., cannot go from REGISTERED to PAID directly)

**Scope:** 1-2 frontend components + possible backend adjustment.

---

### 11. SCRUM-23 — Kanban de Endosso vinculado a apolices ativas

**Type:** Feature (Highest) — Most complex feature in backlog

**Problem:** Endorsements are simple records with no workflow. Need dedicated kanban.

**Changes:**

- **Domain:** New board type `ENDORSEMENT` in proposal enum. Simplified stages: CAPTURE -> QUOTE -> PROTOCOL -> POLICY_ISSUED
- **Schema Prisma:** Add `endorsementType` enum (INCLUSION, EXCLUSION, ALTERATION) to Proposal. Reuse `previousPolicyId` (required for ENDORSEMENT board).
- **Backend:**
  - Validate linked policy is ACTIVE when creating ENDORSEMENT proposal
  - Endorsement-specific checklist items per stage
- **Frontend:**
  - "Endosso" option in proposal type combobox
  - Kanban filter for ENDORSEMENT board
  - Required active policy selection (combobox searching ACTIVE policies for selected client)
  - Display linked policy data (reuse SCRUM-41 component)

**Design decision:** Reuse Proposal model with new board type instead of separate entity. Leverages existing stage/checklist/kanban infrastructure.

**Scope:** Domain + Schema Prisma + backend routes + frontend components. ~3 days.

---

### 12. SCRUM-7 — Sistema de Tarefas Pendentes (bloco de notas)

**Type:** Feature (Medium) — New module from scratch

**Changes:**

- **Schema Prisma:** New `Task` model:
  - `id` UUID, `organizationId` FK, `createdById` FK User, `assignedToId` FK User?
  - `title` String (required), `description` String?
  - `status` enum PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  - `dueDate` DateTime?
  - `createdAt`, `updatedAt`
- **Backend (Light DDD):** `routes/v1/tasks/` — CRUD: create, list, update, delete. List with filters: status, assignedTo, dueDate range. Order by dueDate ASC.
- **Frontend:**
  - New `/tasks` page with sidebar link
  - 3-column mini-kanban (Pending, In Progress, Completed)
  - Default filter: "Next 3 days" view
  - Quick-create modal (title + description + date + assign)
  - Drag & drop between columns to change status
- **Dashboard:** "Tarefas Pendentes" card with count by status (used in SCRUM-25/26)

**Scope:** Schema Prisma + 4-5 backend routes + frontend page + dashboard component. ~2-3 days.

---

### 13. SCRUM-25 + SCRUM-26 — Reformulacao do Dashboard

**Type:** Feature (Medium)
**Dependency:** SCRUM-7 must be complete (Tasks card)

**SCRUM-25 — Smaller cards:**

- **Keep:** Active proposals, Active policies, Renewals in 7 days
- **Add:**
  - "Seguro Novo" — count of NEW_INSURANCE proposals in period
  - "Propostas Pendentes" — proposals stalled for X days
  - "Avisos (Sinistro e Assistencias)" — open claims + pending assistances count
  - "Funil de Leads" — LEAD clients by conversion stage

**SCRUM-26 — Larger cards:**

- **Metas (Renewal + New Insurance):** Comparative chart current vs previous year. Requires:
  - New `Goal` model in Prisma (type, targetValue, period, organizationId) or simple settings config
  - Bar chart with actual vs target values
- **Tarefas Pendentes:** Summary card from SCRUM-7 module (status counts, link to /tasks)
- **Reuniao e Treinamento (Avisos):** Notes/announcements card — can reuse Task module with category tag
- **Equipe:** Keep — member ranking by production

**Backend:** 2-3 new aggregation endpoints (GROUP BY period queries).

**Scope:** 3-5 backend endpoints + dashboard component redesign + Goal model. ~3 days.

---

## Dependency Graph

```
Sprint 1 (no dependencies):
  SCRUM-21 ──┐
  SCRUM-45 ──┤
  SCRUM-40 ──┤── can be done in parallel
  SCRUM-28 ──┤
  SCRUM-47 ──┘

Sprint 2 (depends on Sprint 1 bugs being fixed):
  SCRUM-30 ──┐
  SCRUM-24 ──┤── can be done in parallel
  SCRUM-46 ──┤
  SCRUM-41 ──┘

Sprint 3:
  SCRUM-32 ────────────── independent
  SCRUM-23 ──depends on── SCRUM-41 (reuses linked policy card)
  SCRUM-7  ────────────── independent
  SCRUM-25/26 ─depends on── SCRUM-7 (tasks card)
```

## Test Strategy

- **Bugs (SCRUM-21, 40, 45):** Write regression tests before fixing
- **Schema changes:** Migration test (prisma db push in dev, migrate in prod)
- **New module (SCRUM-7):** TDD — write use case tests first
- **Frontend:** Playwright smoke tests for critical paths (create proposal -> advance -> issue policy)
- **All features:** Manual QA via Playwright MCP after implementation
