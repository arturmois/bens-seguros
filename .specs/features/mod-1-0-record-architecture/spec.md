# MOD-1 Step 1.0 — Record the Approved Architecture Specification

## Problem Statement

`docs/ARCHITECTURE-DECISIONS.md` (MOD-1), `docs/architecture/2026-09-13-modular-architecture.md` and `docs/architecture/context-map.md` still describe the pre-review design: 14 contexts under `contexts/`, consumer-owned gateway ports, domain events and a transactional outbox. The approved target is the revised map in `docs/architecture/2026-09-13-migration-plan.md` §1. Agents executing Phases 1–7 will follow whichever doc they read first, so the stale docs must be corrected before any code moves.

Source of truth for this step: migration plan §0 (ground rules), §1 (target) and the per-step "Target state" lines.

## Goals

- [ ] One consistent architecture description: MOD-1, context map and migration plan agree on module list, layout and communication rules.
- [ ] `context-map.md` holds an explicit per-module allowed-import table that Step 7.3 (lint) can consume.

## Out of Scope

| Feature                                                                           | Reason                                                                        |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Rewriting the body of `2026-09-13-modular-architecture.md`                        | Plan asks only to mark it superseded; the body stays as historical rationale  |
| Any code, lint, `CONTEXT.md` or `CLAUDE.md` change                                | Steps 1.1+, 7.3 and 7.4                                                       |
| Fixing domain gaps S1–S20                                                         | Separate tickets after Phase 7                                                |
| Updating the migration plan header note ("still describe the pre-review version") | The plan is a dated snapshot; its Step 1.0 line documents why the note exists |

---

## Assumptions & Open Questions

| Assumption / decision                             | Chosen default                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Rationale                                                                                                                   | Confirmed? |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Language of the updated MOD-1 and context map     | pt-BR, matching the surrounding documents                                                                                                                                                                                                                                                                                                                                                                                                                                              | Both files are already written in pt-BR                                                                                     | n          |
| Allowed module graph (not spelled out in plan §1) | Derived from today's cross-module imports (`packages/core/src/modules`) mapped onto target modules, plus edges the plan's target states add (3.4 `sales → documents`, 5.4 `sales → commissions`, 6.1 `servicing → sales`, 6.3 `compliance → clients`); edges the plan removes are excluded (`documents → sales`, `workspace → documents`, type-only `servicing → sales` from 3.2 is replaced by the real 6.1 call)                                                                     | Lint in 7.3 needs a concrete graph; grounding it in code + plan avoids inventing edges                                      | n          |
| Resulting graph                                   | `sales → clients, documents, commissions, workspace` · `servicing → sales, clients, workspace, notifications` · `commissions → workspace, notifications` · `workspace → notifications` · `compliance → clients` · `clients, documents, insurers, billing, notifications, search → (none)` · `performance → (none; read-only typed access to sales/commissions/servicing tables)` · every module `→ platform, shared-kernel` · `platform → shared-kernel` · `shared-kernel → (nothing)` | `insurers` has no importer today (proposal/policy store only `insurerId`) — adding one later is a map change reviewed in PR | n          |
| Mapping of today's 23 modules                     | `contact, proposal, policy, endorsement → sales` · `commission → commissions` · `claim, occurrence, assistance → servicing` · `organization, member, invitation → workspace` · `subscription, ai-usage → billing` · `goal, dashboard → performance` · `client → clients` · `insurer → insurers` · `document → documents` · `notification → notifications` · `search → search` · `audit, cep, vehicle-lookup → platform`                                                                | Follows plan steps 1.1, 3.1, 6.1, 6.2, 6.3 and §1                                                                           | n          |
| Status wording of MOD-1                           | "Aprovada (revisada), migração em andamento — ver plano"                                                                                                                                                                                                                                                                                                                                                                                                                               | Review is approved; code has not moved                                                                                      | n          |

**Open questions:** none — all logged above.

---

## User Stories

### P1: MOD-1 reflects the revised architecture ⭐ MVP

**User Story**: As an agent or developer starting a migration step, I want MOD-1 to state the approved decision so that I don't implement gateways, events or an outbox.

**Why P1**: MOD-1 is the entry point linked from CLAUDE.md's doc index.

**Acceptance Criteria**:

1. The MOD-1 row in the decision summary table SHALL describe the revised decision (modular monolith in `packages/core/src/modules`, direct import of provider `index.ts`, no event bus/outbox) and SHALL NOT mention `contexts/`, "eventos" or "outbox". <!-- ARCH-01 -->
2. The MOD-1 section SHALL list the target layout: `shared-kernel/`, `platform/`, and the modules `sales`, `commissions`, `servicing`, `clients`, `insurers`, `documents`, `workspace`, `billing`, `notifications`, `performance`, `search`, `compliance`. <!-- ARCH-02 -->
3. The MOD-1 section SHALL state each of the six communication/boundary rules from plan §1: direct import of public `index.ts`; ports only for vendors and chat → ERP (HMAC); no event bus/outbox/UnitOfWork with `prisma.$transaction` only where atomicity is required; narrowed Prisma type per module; abstract-class DI tokens; workspace as ACL over Better Auth with entitlements contract in `@repo/auth/entitlements`. <!-- ARCH-03 -->
4. The MOD-1 section SHALL link to `architecture/2026-09-13-migration-plan.md` as the migration path and SHALL NOT describe the old Phase 0–5 migration. <!-- ARCH-04 -->
5. The MOD-1 section SHALL NOT contain the terms `gateway`, `outbox`, `contexts/` or `handler` as prescriptive rules. <!-- ARCH-05 -->

**Independent Test**: `grep -niE "outbox|gateway|contexts/|handler" ` over the MOD-1 section returns only lines explicitly marked as superseded history (or nothing).

---

### P1: Context map is the revised dependency list ⭐ MVP

**User Story**: As the author of Step 7.3, I want `context-map.md` to list allowed imports per module so that lint rules can be generated from it.

**Why P1**: Plan 7.3 and 7.4 read the allowed graph from this file.

**Acceptance Criteria**:

1. `context-map.md` SHALL contain a module table with, per module, its location, owned models, and the current modules it absorbs, covering exactly the 12 modules + `platform` + `shared-kernel` from the Assumptions table. <!-- ARCH-06 -->
2. `context-map.md` SHALL contain a "may import" table whose edges equal the "Resulting graph" row of the Assumptions table. <!-- ARCH-07 -->
3. `context-map.md` SHALL declare the out-of-process edges: chat-worker → server HMAC (`sales`, `clients`, `servicing`, `billing`) and chat-worker → worker via BullMQ for AI usage (`billing`). <!-- ARCH-08 -->
4. `context-map.md` SHALL NOT contain a gateway table, an event catalog, or a cross-context transaction exception table. <!-- ARCH-09 -->
5. The allowed synchronous graph in `context-map.md` SHALL be acyclic. <!-- ARCH-10 -->

**Independent Test**: Read the "may import" table, topologically sort it; no cycle; `grep -ciE "outbox|gateway|evento"` returns 0.

---

### P1: Design doc marked superseded ⭐ MVP

**User Story**: As a reader landing on the design doc, I want to see immediately that it is superseded so that I don't follow its rules.

**Why P1**: The design doc is linked from several places and is the most detailed (and most wrong) source.

**Acceptance Criteria**:

1. WHEN a reader opens `2026-09-13-modular-architecture.md` THEN the status line in its header SHALL read "superseded by review" and link to `2026-09-13-migration-plan.md` §1 and `context-map.md`. <!-- ARCH-11 -->
2. The design doc body below the header SHALL have no content change; formatting applied by the pre-commit `prettier --write` hook (table alignment, emphasis style, code-fence formatting) is not a content change. <!-- ARCH-12 -->

**Independent Test**: `git diff -w` on the design doc, after discounting Prettier formatting, touches only the header status line.

---

## Edge Cases

- IF a pt-BR string is added THEN it SHALL use correct diacritics (CLAUDE.md language rule).
- IF `context-map.md` links to the design doc THEN the link text SHALL mark it as superseded rationale, not as the source of rules.

---

## Requirement Traceability

| Requirement ID | Story                     | Phase   | Status   |
| -------------- | ------------------------- | ------- | -------- |
| ARCH-01        | P1: MOD-1 revised         | Execute | Verified |
| ARCH-02        | P1: MOD-1 revised         | Execute | Verified |
| ARCH-03        | P1: MOD-1 revised         | Execute | Verified |
| ARCH-04        | P1: MOD-1 revised         | Execute | Verified |
| ARCH-05        | P1: MOD-1 revised         | Execute | Verified |
| ARCH-06        | P1: Context map           | Execute | Verified |
| ARCH-07        | P1: Context map           | Execute | Verified |
| ARCH-08        | P1: Context map           | Execute | Verified |
| ARCH-09        | P1: Context map           | Execute | Verified |
| ARCH-10        | P1: Context map           | Execute | Verified |
| ARCH-11        | P1: Design doc superseded | Execute | Verified |
| ARCH-12        | P1: Design doc superseded | Execute | Verified |

**Coverage:** 12 total, 12 mapped to execution steps, 0 unmapped.

---

## Success Criteria

- [x] `grep -rniE "outbox|gateway" docs/ARCHITECTURE-DECISIONS.md docs/architecture/context-map.md` returns 0 prescriptive hits.
- [x] `prettier --check` clean on the three docs (lint-staged runs `prettier --write` on `*.md`).
