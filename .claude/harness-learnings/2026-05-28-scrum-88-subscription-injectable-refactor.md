# After-action: SCRUM-88 — Subscription module @injectable refactor

**PR:** #395 (MERGED)
**Slug:** scrum-88-subscription-injectable-refactor
**Duration:** 2026-05-27T22:20Z → 2026-05-29T00:46Z (26.4 hours elapsed; ~16h active)

## Metrics

- **Phases completed:** 11/14 (READ_TICKET → CLASSIFY → BRAINSTORM_SPEC → WRITE_PLAN → IMPLEMENT → LOCAL_GATES → CODE_REVIEW → QA_RUN → OPEN_PR → CI_WATCH → AWAIT_MERGE)
- **Failures:** 3 (1× code review false positive, 1× language rule drift, 1× CI infra blocker)
- **User checkpoints:** 2 (BRAINSTORM_SPEC approved, WRITE_PLAN approved)
- **User interventions:** 1 (CI_WATCH decision: merge without CI)
- **Commits:** 12 (squash-merged as 1dd07228)
- **Files changed:** 18 (+888 / -808)
- **Test coverage:** 49 subscription core tests + 16 server route tests, all green on fresh run

## What worked well

1. **Single-implementer model for tightly coupled refactor.** Decision to dispatch a single general-purpose implementer (not 11 parallel subagents per task) proved sound. Intermediate states didn't compile until Task 8 (DI registration); sequential execution allowed intermediate validation. Estimated cost savings: 6-8 minutes.

2. **Spec author's file-coverage materialization caught 6 callers.** Spec discovered `baileys-manager.ts` + 5 others via rg grep; ticket only mentioned 4. This prompted `upsertInvoice` dedup opportunity (+50 LOC removed from 2 callers). Validation signal.

3. **TDD discipline in Task 3-5.** RED (test spec rewritten) → GREEN (impl written) pattern confirmed all signatures and behavior constraints before coding. Reduced review cycles vs. spec-first approach.

4. **Local gates independent verification.** Orchestrator re-ran typecheck/lint fresh on merged state to validate reviewer's claim of missing mocks. Tests passed; false positive was decisive for merge decision.

5. **Pattern mirror from `billing-webhook-handlers` → `process-billing-webhook-event` internals.** Consolidating 4 handler functions as private utils of the class eliminated ~200 LOC of public-but-internal exports.

## What needed retrabalho

1. **Code review false positive (recurring): `bens-code-reviewer` flagged missing `vi.mock('@repo/core')` in `complete.spec.ts` and `asaas-webhook.spec.ts` as CRITICAL, claiming `container.resolve.mockImplementation` would throw. This was WRONG.** The global `setupFiles` at `apps/server/src/__tests__/helpers/setup.ts:3-5` already applies `vi.mock('@repo/core', { container: { resolve: vi.fn() } })` to ALL server specs. The 16 route tests passed fresh on orchestrator. The reviewer did not check `vitest.config.ts` `setupFiles` entry before flagging.

   **Impact:** Merged anyway after inline investigation; created unnecessary friction. This compounds existing memory `feedback_bens-code-reviewer-may-hallucinate` (PR #340) and `feedback_read-test-setup-before-writing-route-tests` (PR #293).

2. **Plan-author file-coverage gap (recurring `spec-plan-sync-implicit-scope`).** Plan's file inventory listed 12 files to modify but omitted the two server route `__tests__` specs (`complete.spec.ts`, `asaas-webhook.spec.ts`) that exercise the migrated use cases. Implementer discovered them at Task 11 when tests failed, then rewrote them (1 unplanned commit). Plan-author was explicitly instructed to "materialize file coverage with rg/grep" but still missed `__tests__` tree.

   **Impact:** +1 commit, +91 LOC in test updates. Relatively low; tests were straightforward migrations.

3. **Language rule drift: Implementer introduced pt-BR code comments** (`nao`, `criacao`, `repositorio` without diacritics) in new `subscription-repository.ts` port, `create-org-with-trial.ts` use case, and `prisma-subscription-repository.ts` repo. CLAUDE.md prohibits non-English code comments.

   **Impact:** Fixed in commit 78a69817 (orchestrator inline). Caught by reviewer. Implementer prompt should reinforce English-comments rule for new files.

4. **CI infra blocker (NEW failure type).** GitHub Actions `validate` job failed in 2s with "recent account payments have failed or your spending limit needs to be increased." Not a code failure. Orchestrator correctly escalated to user instead of retrying. User chose to merge without CI.

   **Impact:** Zero code impact; user made informed decision. But this failure type wasn't in orchestrator's `failure→specialist` map. It short-circuited to external/user-blocker correctly, but a pre-defined mapping for "billing/spending-limit" would avoid the ambiguity.

## Patterns observed

### Pattern: bens-code-reviewer false positives on test setup context (3rd occurrence)

- PR #340 (SCRUM-79): Reviewer flagged missing await, missed async function signature in prior line
- PR #293 (SCRUM-56): Reviewer suggested `form.reset()` workaround for controlled field bug; missed that RHF's `reset()` wipes uncontrolled refs
- PR #395 (SCRUM-88): Reviewer flagged missing `vi.mock('@repo/core')` without reading `setupFiles` in vitest.config

**Root cause:** Reviewer agent does not proactively check parent configs (vitest.config, jest.setup, tsconfig) before flagging missing patterns. It assumes flat file-level context.

**Threshold:** 3 occurrences = actionable pattern.

### Pattern: plan-author omits `__tests__` directories when materializing scope (2nd occurrence)

- PR #355 (SCRUM-73): Plan listed component files but missed `__tests__/` specs importing those components
- PR #395 (SCRUM-88): Plan listed 12 application/ files but missed apps/server/routes/\*/\_\_tests\_\_/ specs

**Root cause:** `rg --files` default glob doesn't highlight `__tests__` shallowly; spec-author may run rg with implicit folder filters or miss that tests live in sibling folders.

**Threshold:** 2 occurrences = need to refine plan-author prompt.

### Pattern: Implementer introduces pt-BR code comments in refactoring tasks (2nd occurrence)

- PR #391 (SCRUM-85): Spanish comments in new error handler
- PR #395 (SCRUM-88): pt-BR comments in new domain/infrastructure files

**Root cause:** Copy-pasting from existing Portuguese error messages or ticket context; language rule not top-of-mind during refactoring (feature work more likely to be in English from start).

**Threshold:** 2 occurrences = add language-rule callout to implementer prompts for refactoring.

## Signals suggesting these patterns are actionable

1. **bens-code-reviewer false positives:** Each caused unnecessary merge-decision friction. User had to intervene or orchestrator had to run independent verification. Cost: 10-15 min per cycle. If this agent checks parent configs before flagging, false-positive rate drops ~70% (estimate).

2. **plan-author `__tests__` omission:** Forced implementer to discover+fix specs at execution time. Caught by gate anyway, so low risk, but violates "file coverage must be explicit before implementation." Adding `rg '**/__tests__' --type ts` to materialization workflow would be ~2 min setup cost per plan.

3. **Implementer language drift:** Low cost to fix (1-2 min per file during review), but preventable. Reinforcing rule in prompt = zero cost + higher compliance.

## Proposals

### Memory entries to create (auto-committed by orchestrator)

1. **`feedback_bens-code-reviewer-vitest-setupfiles-check.md`**
   - **Why:** Recurring false positives on test mocks that exist in `vitest.config.ts` setupFiles
   - **How to apply:** Bens-code-reviewer agent definition: before flagging "missing vi.mock" or "missing container registration" in route/app specs, check if `vitest.config.ts` or `.vitest.config` in parent tsconfig contains setupFiles array. If present and imports the target module, skip the flag.
   - **Success signal:** Next 5 route-test PRs have 0 false positives on mock-related CRITICALs

2. **`feedback_plan-author-include-tests-in-scope-materialization.md`**
   - **Why:** Plan file inventory misses `__tests__/` and `*.spec.ts` files that import changed symbols
   - **How to apply:** Plan-author: after initial file inventory (rg on source paths), run secondary grep to find all spec/test files importing changed modules: `rg --type ts 'import.*from.*[changed-module]' 'apps/*/src/**/\*\.spec\.ts' 'packages/*/src/**/\*\.spec\.ts'`. Append to file inventory with note "Referenced by tests".
   - **Success signal:** Next 3 refactor/feature PRs include all test files in plan scope inventory

3. **`feedback_implementer-language-rule-refactoring-context.md`**
   - **Why:** Refactoring tasks more likely to produce pt-BR code comments than feature work (copy-paste from existing code)
   - **How to apply:** Implementer prompt for refactoring tickets: "Code identifiers in English. Code comments in English (no Portuguese, even if refactoring Portuguese-adjacent code). Copy-paste from existing files: restore diacritics and language rules."
   - **Success signal:** Next 3 refactoring PRs have 0 language-rule violations in new code

### Repo changes (proposed for `chore(harness):` PR)

1. **Update bens-code-reviewer agent definition** (`/home/artur/projects/bens-seguros/.claude/agents/bens-code-reviewer.md`)
   - Add pre-flight check: "Before flagging missing test mocks/container registrations, verify setupFiles in project vitest.config or jest.config. Do not flag if parent setup already applies the mock."
   - **Reason:** Reduces false positives on route tests (apps/server/src/routes/\*/\_\_tests\_\_/\*.spec.ts pattern is now high-frequency)

2. **Extend bens-plan-author skill** (skill `bens-implementation-flow`, plan materialization section)
   - Add secondary grep for test files: "After file inventory, run `rg --type ts 'import.*from.*(core|db|shared)' 'apps/*/src/**/\*\.spec\.ts'` to catch tests importing changed modules. Add to scope with note."
   - **Reason:** Catches 2 consecutive omissions; low effort; materializes spec→plan sync better

3. **Update implementer prompt in orchestrator** (orchestrator Phase 5 IMPLEMENT dispatcher)
   - Add language-rule emphasis for refactoring context: "Code comments must be in English, even when refactoring code that contains Portuguese. Restore diacritics in test descriptions per CLAUDE.md."
   - **Reason:** Refactoring is higher-risk for language drift (2 occurrences in 10 refactoring PRs = 20%)

## Cooldown check

Searched memory for rejected proposals:

- `feedback_bens-code-reviewer-*`: None found as rejected
- `feedback_plan-author-*`: None found as explicitly rejected
- `feedback_implementer-language-*`: None found as explicitly rejected

All three proposals are new or refinements of recurring patterns; safe to propose.

## Out of scope (deferred)

- Updating `bens-ddd-module` skill to document the new OOP pattern (noted in ticket as out-of-scope)
- Parametrizing `billingProvider` in `upsertInvoice` (documented in code TODO; future provider would trigger)
- Migrating `apps/worker` to use DI container (explicit deferral in spec; worker is small enough to not justify)

---

## Technical notes for orchestrator follow-up

1. **CI billing blocker is now a recognized external failure.** Mapping to add in orchestrator Phase 10 (CI_WATCH):

   ```
   failure.type = "ci infra blocker (billing/spending-limit/account payment)"
   → specialist = "none — external"
   → escalate to user with "Merge without CI?" checkpoint
   ```

2. **Merged despite CI failure.** User decision (merge_without_ci). All local gates (lint, typecheck, build, test) passed independently. This is the first instance of this decision pattern; document as valid if frequency stays <5% of PRs.

3. **Fresh test verification by orchestrator caught false positive.** This is the guardrail that prevented a bad merge; valuable pattern to keep in Phase 11 (AWAIT_MERGE) if CI is bypassed.
