# P2 Backlog Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zerar o backlog P2 do relatório QA — security audit, idempotência GETs, docs de convenção, e refactor de 5 arquivos em `features/proposals/`.

**Architecture:** 4 PRs sequenciais executados nesta ordem: (A) security audit → relatório + possíveis fixes, (B) idempotência audit → relatório + possíveis fixes, (C) docs UI-PATTERNS.md, (D) refactor de 5 arquivos > 200L via decomposição híbrida.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Fastify 5 + Zod, Playwright MCP, Markdown

**Spec:** `docs/superpowers/specs/2026-04-11-p2-backlog-cleanup-design.md`

---

## Execution order

```
Part A (audit/security-p2)
  └─ merge → Part B (audit/idempotency-p2)
              └─ merge → Part C (docs/filter-tabs-convention)
                          └─ merge → Part D (refactor/proposals-component-split)
                                      └─ merge → done
```

Cada parte rebaseia sobre a main atualizada. Não há dependências de código entre os 4 PRs.

---

# PART A — Security audit (PR 1: `audit/security-p2`)

## Task A.1: Create branch + prepare audit directory

**Files:**

- Create: `audit/security-p2-2026-04-11.md`

- [ ] **Step 1: Create branch from main**

```bash
git checkout main && git pull && git checkout -b audit/security-p2
```

- [ ] **Step 2: Create the empty report file as a placeholder**

```bash
mkdir -p audit
cat > audit/security-p2-2026-04-11.md <<'EOF'
## Security P2 Audit — 2026-04-11

**Status:** in progress
**Auditor:** subagent-driven-development flow
**Branch:** audit/security-p2
**Environment:** https://app.bensseg.com + https://api.bensseg.com

### localStorage / sessionStorage findings

_to be filled_

### HTTP headers findings

_to be filled_

### Summary

_to be filled_
EOF
```

Do NOT commit yet — this is a placeholder that will be overwritten by subsequent tasks.

---

## Task A.2: Inspect localStorage / sessionStorage in prod

**Files:**

- Modify: `audit/security-p2-2026-04-11.md`

- [ ] **Step 1: Open prod login via Playwright MCP**

Using `mcp__plugin_playwright_playwright__browser_navigate`:

```
url: https://app.bensseg.com/login
```

- [ ] **Step 2: Log in with test credentials**

Check memory for prod credentials. If only dev credentials exist (`test@user.com` / `Senha@123`), try those first. If they don't work on prod, STOP and ask the user for prod credentials — do not guess.

Use `browser_fill_form` or `browser_type` + `browser_click` on the login form.

- [ ] **Step 3: Navigate to a logged-in page**

```
url: https://app.bensseg.com/clients
```

Wait for the table to render (`browser_wait_for` text "Clientes").

- [ ] **Step 4: Inspect storage via `browser_evaluate`**

```js
;() => {
  const localEntries = Object.fromEntries(
    Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])
  )
  const sessionEntries = Object.fromEntries(
    Object.keys(sessionStorage).map((k) => [k, sessionStorage.getItem(k)])
  )
  return {
    localStorage: localEntries,
    sessionStorage: sessionEntries,
    cookies: document.cookie,
  }
}
```

- [ ] **Step 5: Classify each entry**

For each key/value pair found, classify severity:

- **P0 (bloqueio)**: contains CPF/CNPJ raw, password/password hash, email, nome completo, telefone, endereço, session token (raw JWT body not httpOnly cookie), organizationId plaintext
- **P1 (important)**: userId, tenantId, CASL abilities dump, UI state revealing internal roles/hierarchy
- **P2 (minor)**: theme preference, language, column visibility state
- **OK**: nothing sensitive

- [ ] **Step 6: Update the report file**

Replace the `### localStorage / sessionStorage findings` section with the actual table:

```markdown
### localStorage / sessionStorage findings

| key   | storage      | severity | value preview | rationale     | fix |
| ----- | ------------ | -------- | ------------- | ------------- | --- |
| theme | localStorage | OK       | "dark"        | UI preference | —   |
| ...   | ...          | ...      | ...           | ...           | ... |
```

Include at least:

- Total keys found per storage
- Per-key classification

---

## Task A.3: Inspect HTTP headers of prod endpoints

**Files:**

- Modify: `audit/security-p2-2026-04-11.md`

- [ ] **Step 1: Fetch headers from api.bensseg.com**

```bash
curl -sI https://api.bensseg.com/api/v1/clients > /tmp/api-headers.txt
cat /tmp/api-headers.txt
```

- [ ] **Step 2: Fetch headers from app.bensseg.com**

```bash
curl -sI https://app.bensseg.com > /tmp/app-headers.txt
cat /tmp/app-headers.txt
```

- [ ] **Step 3: Check each of the 6 required headers**

For each header, note present/absent/value:

1. `Strict-Transport-Security` — expect `max-age>=15552000`, `includeSubDomains`
2. `X-Frame-Options` — expect `DENY` or `SAMEORIGIN`
3. `X-Content-Type-Options` — expect `nosniff`
4. `Content-Security-Policy` — expect any non-empty restrictive value
5. `Referrer-Policy` — expect `no-referrer-when-downgrade` or more restrictive (`strict-origin`, `same-origin`, etc.)
6. `Permissions-Policy` — expect any restrictive value

For each, assign severity:

- **P0**: HSTS missing, X-Frame-Options allows \* / absent on app.bensseg.com
- **P1**: CSP missing or contains `unsafe-inline` / `unsafe-eval` globally, `X-Content-Type-Options` missing
- **P2**: Referrer-Policy / Permissions-Policy missing or permissive
- **OK**: present and restrictive

- [ ] **Step 4: Update the report file**

Replace the `### HTTP headers findings` section:

```markdown
### HTTP headers findings

**api.bensseg.com:**

| header                    | present? | value | severity    |
| ------------------------- | -------- | ----- | ----------- |
| Strict-Transport-Security | yes/no   | `...` | P0/P1/P2/OK |
| ...                       | ...      | ...   | ...         |

**app.bensseg.com:**

| header | present? | value | severity |
| ------ | -------- | ----- | -------- |
| ...    | ...      | ...   | ...      |
```

---

## Task A.4: Write summary + commit + open PR

**Files:**

- Modify: `audit/security-p2-2026-04-11.md`

- [ ] **Step 1: Fill in the Summary section**

```markdown
### Summary

- **P0 count:** N
- **P1 count:** N
- **P2 count:** N
- **Assessment:** ALL_GOOD | FIXES_NEEDED

**Notable:**

- <one-line call-outs for anything unusual>

**Recommendation:**

- If ALL_GOOD: merge this PR, close the P2 security item in backlog
- If FIXES_NEEDED: document each fix in the Summary, open follow-up PR(s) separate from this audit PR
```

- [ ] **Step 2: Commit the audit report**

```bash
git add audit/security-p2-2026-04-11.md
git commit -m "docs(audit): P2 security audit — localStorage and prod HTTP headers"
```

- [ ] **Step 3: Push + open PR**

```bash
git push -u origin audit/security-p2
gh pr create --title "docs(audit): P2 security audit report" --body "$(cat <<'PRBODY'
## Summary

Closes the P2 security item from \`audit/qa-report/REPORT.md\`. This is an **investigation PR** — it only adds a report document.

### Findings (high level)
- P0: N
- P1: N
- P2: N
- Assessment: ALL_GOOD | FIXES_NEEDED

See \`audit/security-p2-2026-04-11.md\` for the full breakdown.

## Spec
\`docs/superpowers/specs/2026-04-11-p2-backlog-cleanup-design.md\` §3

## Test plan
- [x] localStorage / sessionStorage inspected in a real logged-in session
- [x] HTTP headers verified on both api and app prod endpoints
- [x] Classification per entry with explicit severity
- [ ] Reviewer: confirm nothing sensitive slipped through

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PRBODY
)"
```

- [ ] **Step 4: Verify no P0 in report**

```bash
grep -c "P0" audit/security-p2-2026-04-11.md
```

If any P0 finding exists, **STOP**. Do not merge this PR. Return to the controller with a BLOCKED status and include the specific P0 issues. The controller will decide whether to spin up a fix PR or escalate.

- [ ] **Step 5: Dispatch code review + Playwright QA + merge (controller's job)**

The implementer subagent STOPS here. The controller handles merge.

---

# PART B — Idempotência GETs (PR 2: `audit/idempotency-p2`)

## Task B.1: Create branch + inventory all GET routes

**Files:**

- Create: `audit/idempotency-p2-2026-04-11.md`

- [ ] **Step 1: Ensure main is up to date, create branch**

```bash
git checkout main && git pull && git checkout -b audit/idempotency-p2
```

- [ ] **Step 2: List all GET routes in apps/server/src/routes/v1/**

```bash
grep -rn --include="*.ts" "method: 'GET'" apps/server/src/routes/v1/ > /tmp/get-routes-method.txt
grep -rn --include="*.ts" "app\.get\b\|\.get(" apps/server/src/routes/v1/ > /tmp/get-routes-app.txt
cat /tmp/get-routes-method.txt /tmp/get-routes-app.txt | sort -u
```

- [ ] **Step 3: Create the report placeholder**

```bash
mkdir -p audit
cat > audit/idempotency-p2-2026-04-11.md <<'EOF'
## Idempotency P2 Audit — 2026-04-11

**Status:** in progress
**Branch:** audit/idempotency-p2

### GET routes inventory

_to be filled_

### Findings

_to be filled_

### Non-idempotent routes detected

_to be filled_

### Assessment

_to be filled_
EOF
```

---

## Task B.2: Classify each GET route

**Files:**

- Modify: `audit/idempotency-p2-2026-04-11.md`

- [ ] **Step 1: For each route found in B.1, read the handler file**

For each `GET /v1/*` route, open the corresponding handler file (e.g. `list-clients.ts`, `get-client.ts`) and read the handler body. Grep for any of these anti-patterns:

```
grep -l "\.update(\|\.create(\|\.delete(\|\.upsert(\|\$transaction" apps/server/src/routes/v1/<file>.ts
```

Or read the handler and look for:

- Calls to `repository.update(...)`, `repository.create(...)`, `prisma.X.update(...)`, `prisma.X.create(...)`
- `auditLogRepository.log(...)` — this is audit logging (append-only, idempotent-ish, OK)
- Incrementing counters (`{ increment: 1 }`, `count + 1`)
- `lastSeenAt`, `viewedAt`, `markAsRead` patterns

- [ ] **Step 2: Classify each route**

For each route:

- **pure-read** — only `findX` / `count` calls, returns data
- **read + audit-log** — also writes to audit log (acceptable)
- **read + metrics** — increments counter/gauge (flag as P1: may inflate metrics with Strict Mode double-call)
- **read + write** — updates business state (flag as P0: bug potential)

- [ ] **Step 3: Fill the inventory table**

Update the report:

```markdown
### GET routes inventory

| route                                  | handler file    | classification | notes        |
| -------------------------------------- | --------------- | -------------- | ------------ |
| GET /api/v1/clients                    | list-clients.ts | pure-read      | ok           |
| GET /api/v1/clients/:id                | get-client.ts   | pure-read      | ok           |
| GET /api/v1/notifications/unread-count | unread-count.ts | pure-read      | count() only |
| ...                                    | ...             | ...            | ...          |
```

List every single GET route from the grep output. None should be omitted.

---

## Task B.3: Write findings + commit + open PR

**Files:**

- Modify: `audit/idempotency-p2-2026-04-11.md`

- [ ] **Step 1: Fill Findings section**

```markdown
### Findings

- **Pure-read routes:** N
- **Read + audit-log routes:** N
- **Read + metrics routes:** N
- **Read + write routes:** N

### Non-idempotent routes detected

<If any, list specifically with file:line and severity. Otherwise write "None — all GET routes are idempotent.">

### Assessment

ALL_IDEMPOTENT | NON_IDEMPOTENT_FOUND
```

- [ ] **Step 2: Commit**

```bash
git add audit/idempotency-p2-2026-04-11.md
git commit -m "docs(audit): P2 idempotency audit — GET routes inventory"
```

- [ ] **Step 3: Push + open PR**

```bash
git push -u origin audit/idempotency-p2
gh pr create --title "docs(audit): P2 idempotency audit report" --body "$(cat <<'PRBODY'
## Summary

Closes the P2 idempotency item from \`audit/qa-report/REPORT.md\`. Classifies every \`GET /api/v1/*\` handler by whether it mutates state.

### Findings (high level)
- Pure-read: N
- Read + audit-log: N
- Read + metrics: N
- Read + write: N
- Assessment: ALL_IDEMPOTENT | NON_IDEMPOTENT_FOUND

See \`audit/idempotency-p2-2026-04-11.md\` for the full inventory.

## Spec
\`docs/superpowers/specs/2026-04-11-p2-backlog-cleanup-design.md\` §4

## Test plan
- [x] Every \`GET /api/v1/*\` route listed and classified
- [x] Explicit assessment at the end

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PRBODY
)"
```

- [ ] **Step 4: Flag non-idempotent routes to controller**

If NON_IDEMPOTENT_FOUND, stop and report BLOCKED with the specific routes. Otherwise, done.

---

# PART C — Docs FilterTabs vs Select (PR 3: `docs/filter-tabs-convention`)

## Task C.1: Create branch + add convention section

**Files:**

- Modify: `docs/UI-PATTERNS.md`

- [ ] **Step 1: Ensure main up to date, create branch**

```bash
git checkout main && git pull && git checkout -b docs/filter-tabs-convention
```

- [ ] **Step 2: Read current `docs/UI-PATTERNS.md` to find the insertion point**

```bash
grep -n "^## " docs/UI-PATTERNS.md
```

Find an appropriate section to insert the new convention after (likely after tables/listings section). If the doc has a section about "Filtros" or "Listagem", insert immediately after. Otherwise, append at the end.

- [ ] **Step 3: Add the new section**

Insert this markdown block at the chosen insertion point:

```markdown
## Filtros de listagem — FilterTabs vs Select

Convenção para decidir entre `<FilterTabs>` (shared primitive) e `<Select>` (shadcn) na `TableToolbar` de um módulo de listagem.

### Regra geral

`FilterTabs` renderiza **apenas a dimensão primária** do módulo, com **no máximo 4 opções**. Todos os demais filtros (incluindo status secundário, período, prioridade) ficam em `<Select>` dentro da toolbar.

### Quando usar `FilterTabs`

- **≤ 4 opções** (mais que 4 quebra o header em mobile 375px)
- **Dimensão primária** — a que o usuário filtra com mais frequência
- **"Todos" é o default comum** (usuário abre a página e clica em cada tab)
- **Valores categóricos**, não faixas contínuas

### Quando usar `<Select>`

- **> 4 opções**
- **Dimensão secundária** (o módulo já tem `FilterTabs` para a primária)
- **Filtro raramente usado**
- **Valores muito numerosos (> 20)** → prefira `<Autocomplete>` ou `<Combobox>`

### Matriz canônica por módulo (2026-04)

| Módulo      | FilterTabs (primário)               | Select (secundário) |
| ----------- | ----------------------------------- | ------------------- |
| clients     | tipo (Lead/Cliente/Ex-Cliente)      | —                   |
| proposals   | tipo (Novo/Renovação)               | estágio             |
| policies    | status (Ativa/Cancelada/Expirada)   | —                   |
| commissions | período (Todas/30 dias/90 dias)     | status              |
| claims      | prioridade (Normal/Alta/Urgente)    | status              |
| assistances | tipo (Guincho/Mecânica/Chaveiro)    | status              |
| insurers    | status (Ativas/Inativas)            | —                   |
| audit       | período (Todas/30 dias/7 dias/Hoje) | entidade, ação      |

### Layout esperado

\`\`\`
┌──────────────────────────────────────────────────────┐
│ <ListPageHeader> │
│ Breadcrumb › Page │
│ h1 + description [Primary CTA] │
├──────────────────────────────────────────────────────┤
│ <TableToolbar> │
│ [FilterTabs] [🔎 search] [Select] [Columns] [Export]│
├──────────────────────────────────────────────────────┤
│ <DataTable /> │
├──────────────────────────────────────────────────────┤
│ <CursorPagination /> │
└──────────────────────────────────────────────────────┘
\`\`\`

### Ao adicionar um novo módulo

1. Identifique a **dimensão primária** (a mais filtrada pelo usuário).
2. Se tiver ≤ 4 opções categóricas → `FilterTabs`.
3. Se tiver qualquer outra dimensão secundária → `<Select>` na toolbar.
4. Adicione uma linha à matriz acima.

### Exceções documentadas

Nenhuma no momento. Se um novo módulo precisar quebrar a convenção, documente a exceção aqui com motivação.
```

Note on escaping: the ASCII diagram block in the markdown above must be a literal markdown code fence. When you write it to the file, escape the triple-backticks inside the heredoc/string.

- [ ] **Step 4: Verify the file still parses (prettier runs on pre-commit)**

```bash
pnpm lint 2>&1 | tail -20
```

Expected: clean. If prettier has opinions about the markdown table, let it reformat on commit.

- [ ] **Step 5: Commit**

```bash
git add docs/UI-PATTERNS.md
git commit -m "docs(ui): formalize FilterTabs vs Select convention"
```

- [ ] **Step 6: Push + open PR**

```bash
git push -u origin docs/filter-tabs-convention
gh pr create --title "docs(ui): formalize FilterTabs vs Select convention" --body "$(cat <<'PRBODY'
## Summary

Closes QA-P2-1 from \`audit/qa-report/REPORT.md\`. Adds a new section to \`docs/UI-PATTERNS.md\` formalizing when to use \`<FilterTabs>\` vs \`<Select>\` in list module toolbars.

Includes:
- Decision rules (≤ 4 options, primary dimension, "Todos" default)
- Canonical matrix of all 8 existing list modules
- ASCII layout diagram
- Guidance for adding new modules

## Spec
\`docs/superpowers/specs/2026-04-11-p2-backlog-cleanup-design.md\` §5

## Test plan
- [x] \`pnpm lint\` clean
- [x] Markdown renders correctly
- [ ] Reviewer: verify matrix matches reality in each module

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PRBODY
)"
```

---

# PART D — Refactor 5 arquivos > 200L (PR 4: `refactor/proposals-component-split`)

## Task D.1: Create branch + inspect the 5 target files

**Files:** none modified yet

- [ ] **Step 1: Main up to date, create branch**

```bash
git checkout main && git pull && git checkout -b refactor/proposals-component-split
```

- [ ] **Step 2: Confirm file sizes**

```bash
wc -l \
  apps/web/src/features/proposals/components/issue-policy-dialog.tsx \
  apps/web/src/features/proposals/components/proposal-kanban.tsx \
  apps/web/src/features/proposals/components/proposal-detail.tsx \
  apps/web/src/features/proposals/components/branch-field-sets.tsx \
  apps/web/src/features/proposals/components/branch-field-sets-property.tsx
```

Expected: 297, 309, 360, 293, 408 (±5L depending on recent edits).

- [ ] **Step 3: List consumers of each file (before refactoring)**

```bash
for f in issue-policy-dialog proposal-kanban proposal-detail branch-field-sets branch-field-sets-property; do
  echo "=== $f ==="
  grep -rn "from '@/features/proposals/components/$f'\|from '.*/$f'" apps/web/src/ --include="*.tsx" --include="*.ts" | head
done
```

Note the consumers. These import paths **must continue to work** after refactor — re-exports in `index.ts` will preserve them.

---

## Task D.2: Refactor `issue-policy-dialog.tsx` (297L)

**Files:**

- Read first, then decide structure: `apps/web/src/features/proposals/components/issue-policy-dialog.tsx`
- Create: `apps/web/src/features/proposals/components/issue-policy-dialog/index.tsx`
- Create: `apps/web/src/features/proposals/components/issue-policy-dialog/steps/*.tsx` (names depend on actual steps found)
- Delete: `apps/web/src/features/proposals/components/issue-policy-dialog.tsx` (original file)

- [ ] **Step 1: Read the current file to identify logical sections**

```bash
head -40 apps/web/src/features/proposals/components/issue-policy-dialog.tsx
```

Then read the full file. Look for: step controller (step 1, step 2, etc.), form sections, validation logic. Typical decomposition will yield 3-5 steps.

- [ ] **Step 2: Create the new folder structure**

```bash
mkdir -p apps/web/src/features/proposals/components/issue-policy-dialog/steps
```

- [ ] **Step 3: Extract each step as a sub-component**

For each logical step you identify, create a file `steps/<step-name>.tsx` that exports a single component receiving the form (RHF) and the dialog state as props. Keep each step ≤ 150 lines.

Example shape for a step component:

```tsx
// apps/web/src/features/proposals/components/issue-policy-dialog/steps/confirm-step.tsx
'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { IssuePolicyFormValues } from '../types'

interface ConfirmStepProps {
  readonly form: UseFormReturn<IssuePolicyFormValues>
}

export function ConfirmStep({ form }: ConfirmStepProps) {
  // body copied from the relevant section of the original file
  return <div>{/* ... */}</div>
}
```

Create a shared `types.ts` in the folder with any form value type that was defined in the original file.

- [ ] **Step 4: Create `index.tsx` orchestrator**

```tsx
// apps/web/src/features/proposals/components/issue-policy-dialog/index.tsx
'use client'

// imports: Dialog, useForm, use case hooks, step components
// (actual imports depend on the original file)

interface IssuePolicyDialogProps {
  // same props the original file exported
}

export function IssuePolicyDialog(props: IssuePolicyDialogProps) {
  // dialog shell + step controller (useState for current step)
  // render the appropriate <Step> based on current step
}
```

Keep the orchestrator ≤ 150 lines. It should only contain:

- Dialog open/close state (if controlled by parent, just props)
- Step index state
- Form instance (RHF)
- Handlers (next, back, submit)
- JSX: `<Dialog>...<StepSwitch currentStep={step} />...<Footer>`

- [ ] **Step 5: Delete the original file**

```bash
rm apps/web/src/features/proposals/components/issue-policy-dialog.tsx
```

- [ ] **Step 6: Verify consumers still resolve**

```bash
pnpm --filter @app/web typecheck
```

If consumers import from `'@/features/proposals/components/issue-policy-dialog'`, TypeScript's module resolution will find the folder's `index.tsx` automatically — this is the default behavior. No consumer changes needed.

If any consumer imported from `'.../issue-policy-dialog.tsx'` with the explicit `.tsx`, fix that consumer to drop the extension.

- [ ] **Step 7: Lint**

```bash
pnpm --filter @app/web lint
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/proposals/components/
git commit -m "refactor(web): split issue-policy-dialog into steps"
```

---

## Task D.3: Refactor `proposal-kanban.tsx` (309L)

**Files:**

- Read: `apps/web/src/features/proposals/components/proposal-kanban.tsx`
- Create: `apps/web/src/features/proposals/components/proposal-kanban/index.tsx`
- Create: `apps/web/src/features/proposals/components/proposal-kanban/kanban-column.tsx`
- Create: `apps/web/src/features/proposals/components/proposal-kanban/kanban-card.tsx`
- Create: `apps/web/src/features/proposals/components/proposal-kanban/kanban-toolbar.tsx` (if the original has toolbar logic)
- Delete: `apps/web/src/features/proposals/components/proposal-kanban.tsx`

- [ ] **Step 1: Read the original**

```bash
head -60 apps/web/src/features/proposals/components/proposal-kanban.tsx
```

Identify: board wrapper, column rendering logic, card rendering logic, any toolbar/filter code local to kanban view.

- [ ] **Step 2: Create folder structure**

```bash
mkdir -p apps/web/src/features/proposals/components/proposal-kanban
```

- [ ] **Step 3: Extract `kanban-card.tsx`**

Create a component that renders a single proposal card. Receive the proposal data + drag handlers as props. Extract any card-specific JSX from the original file.

- [ ] **Step 4: Extract `kanban-column.tsx`**

Create a component that renders one column (one proposal stage). Receives: stage name, list of proposals for that stage, drop handlers. Renders `<KanbanCard>` for each proposal.

- [ ] **Step 5: Extract `kanban-toolbar.tsx` (only if original has toolbar code)**

If the original file has filter/search/action code specific to kanban view, extract it. If not, skip this step.

- [ ] **Step 6: Create `index.tsx` orchestrator**

The orchestrator sets up the DnD context, fetches proposals, groups them by stage, and renders one `<KanbanColumn>` per stage. ≤ 150 lines.

- [ ] **Step 7: Delete original, typecheck, lint, commit**

```bash
rm apps/web/src/features/proposals/components/proposal-kanban.tsx
pnpm --filter @app/web typecheck
pnpm --filter @app/web lint
git add apps/web/src/features/proposals/components/
git commit -m "refactor(web): split proposal-kanban into column/card/toolbar"
```

---

## Task D.4: Refactor `proposal-detail.tsx` (360L)

**Files:**

- Read: `apps/web/src/features/proposals/components/proposal-detail.tsx`
- Create: `apps/web/src/features/proposals/components/proposal-detail/index.tsx`
- Create: `apps/web/src/features/proposals/components/proposal-detail/sections/*.tsx` (names depend on actual sections)
- Delete: `apps/web/src/features/proposals/components/proposal-detail.tsx`

- [ ] **Step 1: Read the file to identify sections**

```bash
grep -n "^function \|^export function \|<Card\|<section\|<div className=\"" apps/web/src/features/proposals/components/proposal-detail.tsx | head -30
```

Look for `<Card>`, `<section>`, or `<div className="...">` groupings. Each visual section becomes a sub-component.

Typical sections in a proposal detail:

- **Header** — client name, proposal number, current stage badge, primary CTAs (Avançar, Perder, Editar)
- **Financial** — prêmio, parcelas, comissão
- **Coverage** — coberturas contratadas
- **Checklist** — checklist items + completion state
- **Timeline** — stage history

Actual names depend on the file. Read it and pick names that match.

- [ ] **Step 2: Create folder structure**

```bash
mkdir -p apps/web/src/features/proposals/components/proposal-detail/sections
```

- [ ] **Step 3: Extract each section**

For each logical section, create `sections/<section-name>-section.tsx`. Each should:

- Accept the proposal data object as a prop (or the specific slice it needs)
- Render its JSX
- Be ≤ 150 lines

Example:

```tsx
// apps/web/src/features/proposals/components/proposal-detail/sections/financial-section.tsx
import type { ProposalData } from '@/api/model'

interface FinancialSectionProps {
  readonly proposal: ProposalData
}

export function FinancialSection({ proposal }: FinancialSectionProps) {
  // JSX copied from relevant part of original file
  return <div>{/* ... */}</div>
}
```

- [ ] **Step 4: Create `index.tsx` orchestrator**

```tsx
// apps/web/src/features/proposals/components/proposal-detail/index.tsx
'use client'

import { HeaderSection } from './sections/header-section'
import { FinancialSection } from './sections/financial-section'
// ... other section imports

interface ProposalDetailProps {
  // same as original
}

export function ProposalDetail(props: ProposalDetailProps) {
  // fetch proposal data (or receive via props)
  // early returns for loading/error states
  return (
    <div className="flex flex-col gap-6">
      <HeaderSection proposal={proposal} />
      <FinancialSection proposal={proposal} />
      {/* ... */}
    </div>
  )
}
```

Keep ≤ 150 lines.

- [ ] **Step 5: Delete original, typecheck, lint, commit**

```bash
rm apps/web/src/features/proposals/components/proposal-detail.tsx
pnpm --filter @app/web typecheck
pnpm --filter @app/web lint
git add apps/web/src/features/proposals/components/
git commit -m "refactor(web): split proposal-detail into sections"
```

---

## Task D.5: Refactor `branch-field-sets.tsx` + `branch-field-sets-property.tsx` (TOGETHER)

**Files:**

- Read: `apps/web/src/features/proposals/components/branch-field-sets.tsx` and `branch-field-sets-property.tsx`
- Create: `apps/web/src/features/proposals/components/branch-fields/branch-field-sets.tsx` (orchestrator ~80L)
- Create: `apps/web/src/features/proposals/components/branch-fields/types.ts`
- Create: `apps/web/src/features/proposals/components/branch-fields/fieldsets/auto.tsx`
- Create: `apps/web/src/features/proposals/components/branch-fields/fieldsets/property.tsx` (thin, delegates to property folder)
- Create: `apps/web/src/features/proposals/components/branch-fields/fieldsets/life.tsx`
- Create: `apps/web/src/features/proposals/components/branch-fields/fieldsets/health.tsx`
- Create: `apps/web/src/features/proposals/components/branch-fields/fieldsets/other.tsx`
- Create: `apps/web/src/features/proposals/components/branch-fields/fieldsets/property/index.tsx` (orchestrator)
- Create: `apps/web/src/features/proposals/components/branch-fields/fieldsets/property/residential.tsx`
- Create: `apps/web/src/features/proposals/components/branch-fields/fieldsets/property/commercial.tsx`
- Create: `apps/web/src/features/proposals/components/branch-fields/fieldsets/property/condominium.tsx`
- Create: `apps/web/src/features/proposals/components/branch-fields/fieldsets/property/shared.tsx`
- Delete: original `branch-field-sets.tsx` and `branch-field-sets-property.tsx`

**These two files must be refactored together** because `branch-field-sets.tsx` probably imports from `branch-field-sets-property.tsx`. Splitting one at a time would leave dangling imports.

- [ ] **Step 1: Read both original files**

```bash
cat apps/web/src/features/proposals/components/branch-field-sets.tsx
cat apps/web/src/features/proposals/components/branch-field-sets-property.tsx
```

Identify:

- What branches exist (auto/property/life/health/other)?
- How does the switch work (by `branchType` prop)?
- Does property have sub-types (residential, commercial, condominium)?
- What shared form fields exist?

**If the actual structure differs significantly from the plan's assumed decomposition (e.g., property doesn't have sub-types, or there's a branch not mentioned like "travel"), adjust the plan's file structure to match reality. Report the deviation as a concern at the end.**

- [ ] **Step 2: Create the folder structure**

```bash
mkdir -p apps/web/src/features/proposals/components/branch-fields/fieldsets/property
```

- [ ] **Step 3: Create `types.ts`**

Extract any shared types (form value type, component props type) from the two original files. If both files use the same `useFormContext<FormValues>` type, that type belongs in `types.ts`.

- [ ] **Step 4: Create `fieldsets/property/shared.tsx`**

Extract any fields that are shared across property sub-types (address, CEP, size, year built, etc.) from the original `branch-field-sets-property.tsx`.

- [ ] **Step 5: Create each property sub-type file**

For each property sub-type (residential, commercial, condominium), extract the specific fields into its own file. Each file should import `shared.tsx` if needed.

- [ ] **Step 6: Create `fieldsets/property/index.tsx` orchestrator**

```tsx
// apps/web/src/features/proposals/components/branch-fields/fieldsets/property/index.tsx
'use client'

import { Residential } from './residential'
import { Commercial } from './commercial'
import { Condominium } from './condominium'
import type { PropertySubtype } from '../../types'

interface PropertyFieldsetProps {
  readonly subtype: PropertySubtype
  // other props
}

export function PropertyFieldset({ subtype, ...rest }: PropertyFieldsetProps) {
  switch (subtype) {
    case 'residential':
      return <Residential {...rest} />
    case 'commercial':
      return <Commercial {...rest} />
    case 'condominium':
      return <Condominium {...rest} />
    default:
      return null
  }
}
```

≤ 80 lines.

- [ ] **Step 7: Create `fieldsets/property.tsx` thin wrapper**

```tsx
// apps/web/src/features/proposals/components/branch-fields/fieldsets/property.tsx
export { PropertyFieldset as Property } from './property'
```

Single re-export. This exists so the main branch switch in `branch-field-sets.tsx` can import all branches from a single uniform location.

- [ ] **Step 8: Create each of the other branch files**

`auto.tsx`, `life.tsx`, `health.tsx`, `other.tsx` — each extracts its own fields from the original `branch-field-sets.tsx`. If the original file has everything inlined in one big switch, split them apart here.

- [ ] **Step 9: Create the main orchestrator `branch-field-sets.tsx`**

```tsx
// apps/web/src/features/proposals/components/branch-fields/branch-field-sets.tsx
'use client'

import { Auto } from './fieldsets/auto'
import { Property } from './fieldsets/property'
import { Life } from './fieldsets/life'
import { Health } from './fieldsets/health'
import { Other } from './fieldsets/other'
import type { BranchFieldSetsProps, BranchType } from './types'

export function BranchFieldSets({ branchType, ...rest }: BranchFieldSetsProps) {
  switch (branchType) {
    case 'AUTO':
      return <Auto {...rest} />
    case 'PROPERTY':
      return <Property {...rest} />
    case 'LIFE':
      return <Life {...rest} />
    case 'HEALTH':
      return <Health {...rest} />
    default:
      return <Other {...rest} />
  }
}
```

≤ 80 lines.

- [ ] **Step 10: Add an `index.ts` re-export to keep old imports working**

```tsx
// apps/web/src/features/proposals/components/branch-fields/index.ts
export { BranchFieldSets } from './branch-field-sets'
```

- [ ] **Step 11: Backwards-compat shim for original file paths**

Create a minimal file at the original path that re-exports from the new folder, so existing consumers that import from `@/features/proposals/components/branch-field-sets` don't break:

```tsx
// apps/web/src/features/proposals/components/branch-field-sets.tsx
export { BranchFieldSets } from './branch-fields'
```

Do NOT delete the `branch-field-sets.tsx` file — keep it as a thin shim (2 lines). Delete `branch-field-sets-property.tsx` entirely (it has no external consumers — the property fieldset is only rendered via the main `BranchFieldSets` switch).

Before deleting `branch-field-sets-property.tsx`, grep for any imports:

```bash
grep -rn "branch-field-sets-property" apps/web/src/ --include="*.tsx" --include="*.ts"
```

If nothing outside the files you're touching imports it, delete safely:

```bash
rm apps/web/src/features/proposals/components/branch-field-sets-property.tsx
```

- [ ] **Step 12: Typecheck + lint + commit**

```bash
pnpm --filter @app/web typecheck
pnpm --filter @app/web lint
git add apps/web/src/features/proposals/components/
git commit -m "refactor(web): split branch-field-sets by branch and property subtype"
```

---

## Task D.6: Final quality gates + Playwright QA

**Files:** none

- [ ] **Step 1: Full quality gates from repo root**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

All green expected.

- [ ] **Step 2: Verify file sizes**

```bash
find apps/web/src/features/proposals -name "*.tsx" -exec wc -l {} \; | awk '$1 > 200' | sort -rn
```

Expected output: empty (no file > 200 lines). If any remain, report as DONE_WITH_CONCERNS.

- [ ] **Step 3: Playwright QA flows**

Use the Playwright MCP to exercise the 5 flows:

1. **Create new proposal** — go to `/proposals/new`, fill in client + branch + subtype + submit. Exercises `BranchFieldSets` + `PropertyFieldset` (or equivalent for each branch).
2. **List + filter proposals** — go to `/proposals`, verify listing still works.
3. **Kanban view** — toggle to Kanban, verify columns render and cards are draggable. Exercises `proposal-kanban/*`.
4. **Proposal detail** — click into a proposal, verify all sections render. Exercises `proposal-detail/sections/*`.
5. **Issue policy** — from a proposal, open "Emitir apólice" dialog, walk through steps. Exercises `issue-policy-dialog/steps/*`.

Take screenshots into `audit/qa-report/after-p2-refactor/`.

- [ ] **Step 4: Visual diff check against pre-refactor screenshots**

Compare against `audit/qa-report/screenshots/02-proposals-desktop.png` (pre-refactor) and the proposal detail / kanban screenshots from earlier QA runs.

- [ ] **Step 5: Push + open PR**

```bash
git push -u origin refactor/proposals-component-split
gh pr create --title "refactor(web): split 5 proposals components > 200L" --body "$(cat <<'PRBODY'
## Summary

Closes the P2 maintainability item: 5 files in \`features/proposals/\` exceeded the 200L limit from CLAUDE.md. Decomposed using hybrid strategy:

- **By branch type**: \`branch-field-sets\` + \`branch-field-sets-property\` → \`branch-fields/\` folder with per-branch files + per-property-subtype files
- **By logical section**: \`proposal-detail\` → sections/, \`proposal-kanban\` → column/card/toolbar, \`issue-policy-dialog\` → steps/

### File size before → after

| Original | Before | After (orchestrator) |
|---|---|---|
| issue-policy-dialog.tsx | 297 | ~80 |
| proposal-kanban.tsx | 309 | ~80 |
| proposal-detail.tsx | 360 | ~80 |
| branch-field-sets.tsx | 293 | ~80 |
| branch-field-sets-property.tsx | 408 | (deleted — merged into branch-fields/fieldsets/property/) |

Every sub-component ≤ 150 lines.

### Backwards compatibility

Consumers that import from \`@/features/proposals/components/issue-policy-dialog\` etc. continue to work via the folder's \`index.tsx\`. \`branch-field-sets.tsx\` is kept as a 2-line re-export shim.

## Spec
\`docs/superpowers/specs/2026-04-11-p2-backlog-cleanup-design.md\` §6

## Test plan
- [x] \`pnpm lint && pnpm typecheck && pnpm build && pnpm test\` — all green
- [x] No file in \`features/proposals/\` exceeds 200 lines
- [x] Playwright QA: create / list / kanban / detail / issue policy flows
- [x] Screenshots before/after in \`audit/qa-report/after-p2-refactor/\`
- [ ] Reviewer: scan sub-component boundaries for prop drilling

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PRBODY
)"
```

- [ ] **Step 6: Dispatch code reviewer from controller, handle findings, merge**

The implementer subagent STOPS here. The controller handles review loop + merge.

---

# Self-review appendix (for the plan author)

- **Spec coverage:** every section in `2026-04-11-p2-backlog-cleanup-design.md` maps to a Part (A→§3, B→§4, C→§5, D→§6). Each critério de aceitação in the spec has a corresponding task.
- **Placeholder scan:** no "TBD", no "similar to Task N" without code. Section names in D.4 are explicitly marked as "names depend on actual sections found in the file".
- **Type consistency:** shared types (`BranchFieldSetsProps`, `ProposalData`, step form types) appear in types.ts files as declared. `BranchType` enum referenced in D.5 step 9 must come from Prisma/shared enums — the implementer should grep for the existing enum.
- **Ambiguity intentional:** task D.2/D.3/D.4/D.5 instruct the implementer to inspect the actual files first and adjust names if the plan's guessed decomposition doesn't match reality. This is deliberate — the plan author didn't read every line of 1667 lines of code.
- **Task B.2** may find many GET routes. If > 30 routes, batching them into groups is acceptable (e.g., "clients + proposals + policies" as one commit).
