---
name: bens-orchestrator
description: Orquestrador autônomo do bens-seguros. Use quando o user invoca `/work SCRUM-XX` ou pede "implementar ticket Y de ponta a ponta". Executa Jira → spec → plan → implementação → PR → after-action com 2 checkpoints (após spec, após plan) e arch escalation. Dispatcha specialists em falhas. NÃO use pra trabalho manual; pra implementação guiada manualmente, use `bens-implementation-flow`.
---

# bens-orchestrator — agente orquestrador autônomo

Esta skill executa o fluxo Jira → PR de ponta a ponta. Carregada pelo slash `/work SCRUM-XX`.

## Convenções de naming (centralizadas — referenciadas por subagents)

- `ticket_id` = `SCRUM-71` (raw do Jira, uppercase)
- `ticket_lower` = `scrum-71` (lowercase do ID; usado em paths/branch)
- `slug` = `${ticket_lower}-${kebab(short_title)}` — ex: `scrum-71-emissao-apolice-dados-contato`
- `short_title` = primeiras 5-7 palavras do título do Jira, sluggificadas
- `branch` = `feat/${ticket_lower}`
- `worktree_path` = `../bens-seguros-${ticket_lower}`
- `date` = `YYYY-MM-DD` (ISO date do dia de execução, ex `2026-05-20`). Usado em paths de spec/plan/learnings: `${date}-${slug}-design.md`, `${date}-${slug}.md`, `${date}-${slug}.md` respectivamente.
- `ticket_title` = `summary` do ticket Jira (ex: "RETIRAR INFORMAÇÃO DO EMPRESARIAL")
- `ticket_brief` = primeiras 2-3 frases do `description` do ticket (~200 chars), pra contexto compacto em prompts de subagent

## Pré-condições (checadas antes de qualquer phase)

1. `ticket_id` válido (regex `^[A-Z]+-\d+$`)
2. Working tree limpo no main checkout (`git status --porcelain` vazio). NÃO limpo → refuse com mensagem; NÃO faz auto-stash.
3. `gh` autenticado (`gh auth status`)
4. Atlassian MCP responde (`mcp__plugin_atlassian_atlassian__getAccessibleAtlassianResources`)
5. **Subagent availability check (PR-3 + PR-4 + PR-5):** verificar se os bens-\* subagents necessários estão na lista de `subagent_type` do tool `Agent`. Lista completa (9 subagents): `bens-jira-reader`, `bens-spec-author`, `bens-plan-author`, `bens-code-reviewer`, `bens-test-fixer`, `bens-hook-resolver`, `bens-review-applier`, `bens-qa-runner` (Phase 8), `bens-qa-fixer` (Phase 8 failure), `bens-after-action` (Phase 12). Se algum subagent requerido pra phase atual faltar → **fallback inline** (modo degradado): main session executa o trabalho do subagent diretamente em vez de dispatchar (memory: `orchestrator-subagent-restart-required`). Logar warning + salvar em state file `failures` com type `subagent_unavailable` pro after-action propor melhoria. **Não bloqueia o fluxo** — orchestrator continua, só perde isolamento de contexto.

## State machine — 14 phases

| #   | Estado          | Subagent                        | Checkpoint user               | Saída                                              |
| --- | --------------- | ------------------------------- | ----------------------------- | -------------------------------------------------- |
| 1   | READ_TICKET     | `bens-jira-reader`              | Não                           | `ticket-context.md` no worktree                    |
| 2   | CLASSIFY        | inline                          | Não                           | tipo + tags de skills                              |
| 3   | BRAINSTORM_SPEC | `bens-spec-author`              | **Sim**                       | spec em `docs/superpowers/specs/`                  |
| 4   | WRITE_PLAN      | `bens-plan-author`              | **Sim**                       | plan em `docs/superpowers/plans/`                  |
| 5   | IMPLEMENT       | inline                          | Não, exceto **ARCH_DECISION** | commits no branch                                  |
| 6   | LOCAL_GATES     | inline                          | Não                           | green / failure dispatch                           |
| 7   | CODE_REVIEW     | `bens-code-reviewer`            | Não                           | report; CRITICAL → failure dispatch                |
| 8   | QA_RUN          | `bens-qa-runner` (se UI)        | Não                           | report / failure dispatch                          |
| 9   | OPEN_PR         | inline (`gh pr create`)         | Não                           | PR URL                                             |
| 10  | CI_WATCH        | inline (`gh pr checks --watch`) | Não                           | green / failure dispatch (→ `check-pipeline`)      |
| 11  | AWAIT_MERGE     | passive                         | passive                       | merge detected                                     |
| 12  | AFTER_ACTION    | `bens-after-action`             | Não                           | proposal de harness changes                        |
| 13  | APPLY_LEARNINGS | inline                          | Não                           | memory commits + opcional PR `chore(harness): ...` |
| 14  | TEARDOWN        | inline                          | Não                           | clean                                              |

## Checkpoints — quando pausa pro user

1. **Após spec gerada (Phase 3):** "Spec gerado em `<path>`. Aprovar pra seguir pro plano? (yes/no/comentário)"
2. **Após plan gerado (Phase 4):** mesmo padrão
3. **ARCH_DECISION durante Phase 5:** pergunta + 2-4 opções + recomendação, quando:
   - Necessidade de nova tabela / mudança de schema
   - Mudança em contrato de API pública
   - Nova dependência (package.json)
   - Nova MCP/integração externa
   - Mudança em CLAUDE.md / hooks / skills durante implementação
   - Ambiguidade na spec/plano sem decisão óbvia
   - Conflito com `docs/ARCHITECTURE-DECISIONS.md`

Outras phases NUNCA pausam pro user (autonomia full per memory: `autonomous-pr-flow-preference`).

## Failure dispatch

```
on_failure(failure_type, payload):
  especialista_id = classify(failure_type)
  if especialista_id == UNKNOWN:
    → escalate_user_unknown(failure_type, payload)
  else:
    invoke_specialist(especialista_id, payload, max_retries=3):
      1. especialista lê payload
      2. propõe fix
      3. main session aplica (Edit/Write)
      4. re-roda o gate
      5. green? → exit loop, voltar pro fluxo
      6. red após 3 tentativas? → escalate_user

escalate_user:
  - Marca PR como draft
  - Comenta no PR explicando onde travou + últimas N tentativas
  - Pinga user na sessão ou comentário Jira
  - State salvo no worktree (`.orchestrator-state.json`)
  - after-action review (Phase 12) recebe payload e propõe melhoria

escalate_user_unknown:
  - Pausa orchestrator
  - Diagnóstico: "Falha de tipo novo: <payload>. Specialists: <list>. Nenhum match."
  - Pede ao user: (a) resolver manualmente, (b) sugerir specialist, ou (c) deixa after-action propor novo
  - after-action SEMPRE recebe esse tipo e propõe novo specialist na PR `chore(harness): ...`
```

### Mapeamento failure → specialist

| Failure type                      | Specialist                             | Recursos                                                    |
| --------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `lint failure`                    | `bens-test-fixer`                      | `bens-code-rules`                                           |
| `typecheck failure`               | `bens-test-fixer`                      | `bens-code-rules`                                           |
| `test failure`                    | `bens-test-fixer`                      | `superpowers:test-driven-development`, `bens-ddd-module`    |
| `build failure`                   | `bens-test-fixer`                      | `bens-code-rules` (tipo/import não capturado por typecheck) |
| `hook block` (forbidden patterns) | `bens-hook-resolver`                   | `bens-code-rules`                                           |
| `code review CRITICAL`            | `bens-review-applier`                  | `bens-code-rules` + output do reviewer                      |
| `qa playwright failure`           | `bens-qa-fixer`                        | `frontend-design` + screenshots                             |
| `ci pipeline failure`             | `check-pipeline` (skill, não subagent) | `bens-release` se for deploy                                |
| `arch decision needed`            | nenhum → escalate user direto          | —                                                           |
| `unknown failure type`            | nenhum → escalate_user_unknown         | —                                                           |

## Token budget (soft caps)

| Phase           | Cap soft | Ação ao exceder                               |
| --------------- | -------- | --------------------------------------------- |
| READ_TICKET     | 15k      | Cap em 10k de Confluence; resumir attachments |
| BRAINSTORM_SPEC | 30k      | Pergunta: "Decompor em sub-tickets?"          |
| WRITE_PLAN      | 30k      | Mesma pergunta                                |
| IMPLEMENT       | 200k     | Alert: "Considerar split em N PRs"            |
| Outros          | 50k cada | Alert + log                                   |

Após 3 alerts no mesmo ticket → escalate user obrigatório.

## MCP failure handling

| MCP                    | Fallback se falhar                                    |
| ---------------------- | ----------------------------------------------------- |
| Atlassian (Jira)       | **Hard requirement.** Pausa + retry 60s + escala.     |
| Atlassian (Confluence) | Continua; loga `confluence: unavailable`.             |
| Sentry                 | Continua sem search de errors; loga INFO.             |
| Playwright             | Pula QA; marca `qa: skipped (mcp down)` no PR body.   |
| Serena                 | Continua com Grep/Glob; loga WARNING (menos preciso). |
| Context7               | Continua sem docs externas; loga INFO.                |

## Estado salvo (`.orchestrator-state.json`)

No root do worktree:

```json
{
  "ticket": "SCRUM-XX",
  "slug": "scrum-xx-short-title",
  "phase": "IMPLEMENT",
  "started_at": "2026-05-19T18:42:00Z",
  "spec_path": "docs/superpowers/specs/...",
  "plan_path": "docs/superpowers/plans/...",
  "pr_url": null,
  "completed_phases": [
    "READ_TICKET",
    "CLASSIFY",
    "BRAINSTORM_SPEC",
    "WRITE_PLAN"
  ],
  "failures": [
    {
      "phase": "LOCAL_GATES",
      "type": "test failure",
      "attempts": 2,
      "specialist": "bens-test-fixer",
      "resolved": true
    }
  ],
  "user_interventions": [
    { "phase": "WRITE_PLAN", "type": "checkpoint", "answer": "approved" }
  ],
  "paused_reason": null,
  "aborted_at": null
}
```

Reentrada (`/work SCRUM-XX` num worktree existente): lê state, mostra resumo, pergunta retomar ou recomeçar.

## Execution flow — phases 1-4 (PR-2: funcional)

Main session executa esta sequência. Cada step é literal — NÃO improvise.

### Phase 0: Pré-checks + setup worktree

1. Validar `ticket_id`: regex `^[A-Z]+-\d+$`. Inválido → erro, aborta.
2. `git status --porcelain` no main checkout. NÃO vazio → refuse com mensagem ("Working tree não está limpo. Commit ou stash mudanças antes de /work").
3. `gh auth status`. Não autenticado → refuse.
4. Testar Atlassian MCP: `mcp__plugin_atlassian_atlassian__getAccessibleAtlassianResources`. Vazio → escalate ("Atlassian MCP indisponível. Retry em 60s ou abortar?").
5. Worktree setup:
   ```bash
   git fetch origin
   git worktree add ../bens-seguros-${ticket_lower} -b feat/${ticket_lower} origin/main
   cd ../bens-seguros-${ticket_lower}
   ln -sf ../bens-seguros/.env .env   # path relativo (memory: worktree-env-symlink-for-prisma)
   pnpm install --frozen-lockfile
   pnpm db:generate
   ```
6. Inicializar `.orchestrator-state.json` no root do worktree (ver "State management" abaixo).
7. Logar via TaskCreate cada phase pra tracking visual.

### Phase 1: READ_TICKET

1. Dispatchar subagent `bens-jira-reader`:
   ```
   Agent({
     description: "Read ticket SCRUM-XX",
     subagent_type: "bens-jira-reader",
     prompt: "Ticket ID: ${ticket_id}. Worktree path: ${worktree_path}. Produce ticket-context.md per your system prompt contract."
   })
   ```
2. Receber output (caminho ticket-context.md confirmado).
3. Validar que ticket-context.md existe e tem o cabeçalho principal (`# Ticket Context:`) + 7 seções obrigatórias `## ` (Description, Acceptance Criteria, Comments, Linked Confluence pages, Sentry errors, Git history, Keywords). Total: 1 h1 + 7 h2 = 8 partes; usar `grep "^# " | wc -l` ≥ 1 e `grep "^## " | wc -l` ≥ 7.
4. Atualizar state: `completed_phases.push("READ_TICKET")`, `phase = "CLASSIFY"`.

### Phase 2: CLASSIFY (inline na main session)

1. Ler ticket-context.md.
2. Determinar `type` (heurísticas):
   - Jira type "Bug" → `bug`
   - Jira type "Task" com keywords "refactor", "cleanup", "rename" → `refactor`
   - Jira type "Sub-task" sob épico de chore → `chore`
   - Outros → `feature`
3. Determinar `scope` (analisar título + descrição + ACs):
   - Mentions `apps/web`, `components`, `page`, `form`, UI → `frontend`
   - Mentions `apps/server`, `apps/chat-server`, API, use case, endpoint, backend → `backend`
   - Mentions `prisma`, `schema`, `migration`, `RLS` → `db`
   - Mentions `Docker`, `deploy`, `infra`, `CI` → `infra`
   - Multiple áreas → `mixed`
4. Slug do ticket: `${ticket_lower}-${kebab(primeiras 5-7 palavras do título)}`. Ex: `scrum-71-emissao-apolice-dados-contato`.
5. Atualizar state: `slug`, `type`, `scope`, `completed_phases.push("CLASSIFY")`, `phase = "BRAINSTORM_SPEC"`.

### Phase 3: BRAINSTORM_SPEC

1. Dispatchar subagent `bens-spec-author`:
   ```
   Agent({
     description: "Generate spec for SCRUM-XX",
     subagent_type: "bens-spec-author",
     prompt: "Input: { ticket_context_path: '${worktree}/ticket-context.md', type: '${type}', scope: '${scope}', slug: '${slug}', date: '${date}' }. Generate spec per your system prompt contract. If you find AMBIGUIDADE — requer decisão do user, return that markdown instead of writing the spec."
   })
   ```
2. Se output for `# AMBIGUIDADE` → escalate user. **Quem escala = main session** (orchestrator), usando a tool `AskUserQuestion` disponível na main session (subagents não têm essa tool). Passar pergunta + opções + recomendação. Receber resposta, re-invocar `bens-spec-author` com decisão tomada.
3. Validar spec existe em `docs/superpowers/specs/${date}-${slug}-design.md` (path gitignored).
4. Atualizar state: `spec_path`, `phase = "AWAIT_SPEC_REVIEW"` (NÃO push em `completed_phases` ainda — só após aprovação do checkpoint).
5. **CHECKPOINT user obrigatório:** Mensagem ao user: "Spec gerado em \`${spec_path}\`. Aprovar pra seguir pro plano? (responder: yes / no / comentários)". WAIT user response (usar `AskUserQuestion` se a resposta deve ser estruturada com opções).
6. Se `yes` → seguir. Se `no` ou comentários → re-invocar `bens-spec-author` com feedback, voltar pra step 3. Se múltiplas rodadas (>3) → escalate "checkpoint preso, talvez decompor ticket?".
7. Atualizar state: `completed_phases.push("BRAINSTORM_SPEC")`, `user_interventions.push({phase: "BRAINSTORM_SPEC", type: "checkpoint", answer})`, `phase = "WRITE_PLAN"`.

### Phase 4: WRITE_PLAN

1. Dispatchar subagent `bens-plan-author`:
   ```
   Agent({
     description: "Generate plan for SCRUM-XX",
     subagent_type: "bens-plan-author",
     prompt: "Input: { spec_path: '${spec_path}', ticket_id: '${ticket_id}', slug: '${slug}', type: '${type}', scope: '${scope}', date: '${date}' }. Generate plan per your system prompt contract."
   })
   ```
2. Validar plan existe em `docs/superpowers/plans/${date}-${slug}.md` (path gitignored).
3. Atualizar state: `plan_path`, `phase = "AWAIT_PLAN_REVIEW"` (NÃO push em `completed_phases` ainda — só após aprovação).
4. **CHECKPOINT user obrigatório:** "Plano gerado em \`${plan_path}\`. Aprovar pra começar implementação? (yes / no / comentários)". WAIT response (usar `AskUserQuestion` se quiser estrutura).
5. Yes → seguir. No/comentários → re-invocar `bens-plan-author` com feedback, voltar pra step 2.
6. Atualizar state: `completed_phases.push("WRITE_PLAN")`, `user_interventions.push({phase: "WRITE_PLAN", type: "checkpoint", answer})`, `phase = "IMPLEMENT"`.

## Execution flow — phases 5-10 (PR-3: funcional)

### Phase 5: IMPLEMENT

Main session executa o plano gerado em Phase 4. NÃO improvise — siga o plan task-by-task.

**Decisão: inline ou subagent dispatch?** (memory: `refactor-inline-vs-subagent-dispatch`)

Antes de invocar `subagent-driven-development`, avaliar complexidade do plano:

| Condição                                                                                                                            | Caminho                                 |
| ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Plan é refactor-only + spec.AC todos dizem "no behavior change" + estimado <200 LOC + tudo em `apps/web/src/features/*/components/` | **inline** (main session, sem subagent) |
| Backend (`apps/server`, `apps/chat-server`, `packages/core`, `packages/db`)                                                         | **subagent**                            |
| New feature (state + behavior + tests)                                                                                              | **subagent**                            |
| TDD obrigatório (DDD Full)                                                                                                          | **subagent**                            |
| Multi-system (web + server + db)                                                                                                    | **subagent**                            |
| Plan estimado >200 LOC                                                                                                              | **subagent**                            |

Inline tem feedback loop mais rápido (sem handoff state→subagent→state, economiza 10-15min em refactors cirúrgicos). Subagent tem isolamento de contexto (não polui main com diffs grandes).

Exemplo: SCRUM-72 (5-component refactor, 140 add / 62 del, sem behavior change) → inline. SCRUM-71 (novo endpoint + webhook + worker job) → subagent.

1. Ler `${plan_path}` integralmente.
2. Carregar skill `superpowers:subagent-driven-development` (referência) — orchestrator atua como o "controller" descrito lá: dispatcha implementer subagents por task quando aplicável (per tabela acima), ou executa inline em refactors cirúrgicos / fallback (per Pré-condição 5).
3. Pra cada task no plano:
   - Marcar task como in_progress em TaskCreate
   - **Se subagents disponíveis (full mode):** Dispatchar `Agent({subagent_type: "general-purpose"})` com prompt formatado per `superpowers:subagent-driven-development` implementer template + texto completo da task. NÃO usa subagent-driven review loop completo (o `bens-code-reviewer` da Phase 7 cobre isso).
   - **Se fallback inline (degraded mode):** main session executa a task diretamente (Edit/Write/Bash conforme steps do plan), respeitando TDD obrigatório em DDD Full.
   - Após cada step completar: validar (run command, check expected output). Falha → invocar specialist via Failure dispatch (ver abaixo).
   - Após task completar: commit segundo conventional commits (já no plan).
   - Marcar task como completed.
4. **ARCH_DECISION durante implementação:** escalar pro user via `AskUserQuestion` quando encontrar (lista canônica — bate com Checkpoints section linhas 51-57):
   - Necessidade de nova tabela / mudança de schema NÃO prevista na spec
   - Mudança em contrato de API pública NÃO prevista
   - Nova dependência (package.json) NÃO prevista
   - **Nova MCP / integração externa**
   - Mudança em CLAUDE.md / hooks / skills durante a feature (deve ir pra PR separada)
   - Ambiguidade real na spec/plano que não tem decisão óbvia
   - Conflito com `docs/ARCHITECTURE-DECISIONS.md`
5. Todos commits do orchestrator incluem trailer `Co-Authored-By: Claude bens-orchestrator <noreply@anthropic.com>` (spec audit trail).
6. Atualizar state: `completed_phases.push("IMPLEMENT")`, `phase = "LOCAL_GATES"`.

### Phase 6: LOCAL_GATES

Rodar 5 quality gates do projeto (CLAUDE.md: lint, typecheck, test, build) no escopo afetado.

1. Identificar packages tocados via `git diff --name-only origin/main..HEAD | sed -E 's|^(apps\|packages)/([^/]+)/.*|\1/\2|' | sort -u`.
2. Pra cada package afetado, rodar em paralelo (background):
   ```bash
   pnpm --filter <pkg> lint
   pnpm --filter <pkg> typecheck
   pnpm --filter <pkg> test
   ```
   E build na raiz:
   ```bash
   pnpm build
   ```
3. Se todos verdes → seguir pra Phase 7.
4. Se qualquer falhar → **failure dispatch** com tipo apropriado (`lint failure`, `typecheck failure`, `test failure`, `build failure`). Specialist tenta fix, re-roda gate, max 3 tentativas. Se persistir → escalate_user.
5. Atualizar state: `completed_phases.push("LOCAL_GATES")`, `phase = "CODE_REVIEW"`.

### Phase 7: CODE_REVIEW

**Pré-passo: rebase worktree em `origin/main`** (solo dev pode ter ficado behind durante implementação, memory: [[branch-behind-during-pr-development]]):

```bash
cd ${worktree_path}
git fetch origin
git rebase origin/main
# Se conflitos: resolver localmente → re-rodar `pnpm lint && pnpm typecheck` → commit resolution
# Se clean: prosseguir; reviewer verá apenas diffs reais da feature, sem ruído de PRs paralelas
```

Justificativa: SCRUM-73 levou ~4.5h. Durante esse tempo, 4 PRs mergearam em main. Reviewer reportou "businessSegment removido" — era branch behind, não remoção. Rebase pré-review elimina esse falso positivo.

Dispatchar `bens-code-reviewer` no diff do branch.

1. Dispatch:
   ```
   Agent({
     description: "Code review feat/${ticket_lower}",
     subagent_type: "bens-code-reviewer",
     prompt: "Review do branch feat/${ticket_lower} no worktree ${worktree_path}. Spec local: ${spec_path}. Plan local: ${plan_path}. Diff: git diff origin/main..HEAD. Output report categorizado CRITICAL/WARNING/INFO."
   })
   ```
2. Receber report. Se 0 CRITICAL → seguir pra `QA_RUN`.
3. Se >0 CRITICAL → **failure dispatch** com type `code review CRITICAL`, payload = report + critical_items extraídos. `bens-review-applier` tenta aplicar. Após cada round, re-dispatch `bens-code-reviewer` pra validar fix.
4. WARNING e INFO: persist em PR body como TODO list (não bloqueia merge).
5. Atualizar state: `completed_phases.push("CODE_REVIEW")`, `phase = "QA_RUN"`.

### Phase 8: QA_RUN (PR-4: funcional)

QA via Playwright MCP em features de UI.

#### 8.1 — Detectar se QA é necessária

Decisão em 3 níveis (memory: `feedback_orchestrator-qa-skip-visible-changes-semantic`):

1. **Features / pages / layouts tocados:** `git diff origin/main..HEAD --name-only` casa em `apps/web/src/features/**/components/*.tsx`, `apps/web/src/app/**/page.tsx`, ou `apps/web/src/app/**/layout.tsx` → **roda QA** (seguir pra 8.2).
2. **Base UI components (`apps/web/src/components/ui/*.tsx`) tocados:** inspecionar diff:
   - Se o diff toca APENAS atributos invisíveis (`aria-*`, `data-*`, `id=`, `title=`, `role=`) → skip QA com motivo `no_visible_changes`. Detecção: `git diff origin/main..HEAD apps/web/src/components/ui/` mostra mudanças, e `grep -E 'className=|render=|>[^<]*<'` no diff retorna nada novo (= sem mudança visível).
   - Se o diff toca atributos visíveis (`className=`, `render=`, `children`/texto renderizado, estrutura JSX) → **roda QA** com motivo `visible_changes_in_base_ui` (base UI afeta todas as features que consomem o componente).
3. **Nenhum arquivo UI tocado** (só backend/db/infra/docs) → skip QA com motivo `no_ui_changes`.

#### 8.2 — Pre-flight: porta :3000 (CORS pinned, memory: `server-cors-pinned-to-3000`)

Server CORS é fixo em `http://localhost:3000`. Worktree do orchestrator NÃO pode subir web em outra porta sem quebrar autenticação.

1. Checar se porta :3000 está ocupada por processo Next.js (NÃO usar `/api/health` — falso positivo via proxy do server :3001): `lsof -ti:3000 2>/dev/null` retorna PID se ocupada, vazio se livre. Alternativa: `curl -sf http://localhost:3000/_next/health` (endpoint Next.js específico, não passa por proxy).
2. Se porta livre:
   - Main session sobe AMBOS no worktree (em background, em paralelo):
     - `pnpm --filter @app/web dev` (porta :3000 — Next.js frontend)
     - `pnpm --filter @app/server dev` (porta :3001 — Fastify API; **OBRIGATÓRIO** se ticket envolve UI que faz login/data fetching, ou seja, ~todas as features web. Memory: `orchestrator-qa-preflight-server-startup`)
     - Se ticket toca chat ou widget: também `pnpm --filter @app/chat-server dev` (porta :3002)
   - Aguardar `http://localhost:3000/_next/health` E `nc -w1 localhost 3001 </dev/null` ambos responderem (max 60s combinado)
   - Seguir pra 8.3
3. Se porta :3000 ocupada (PID retornou ou `_next/health` 200):
   - `AskUserQuestion` com 3 opções:
     - **(a) Pausar main dev session** — você para o `pnpm dev` no main checkout, eu subo no worktree, rodo QA, paro o worktree, e você reinicia
     - **(b) Pular QA neste ticket** — marca `qa_skipped: true`, `qa_skip_reason: "port_conflict_user_chose_skip"`, seguir pra Phase 9 com warning no PR body recomendando QA manual pós-merge
     - **(c) Abortar orchestrator** — setar `paused_reason: "port_conflict_user_chose_abort"` no state + salvar state file. Orchestrator encerra. User retoma com `/work SCRUM-XX` quando porta liberar.
   - Timeout de 60s: fallback (b) por segurança.

#### 8.3 — Dispatchar bens-qa-runner

```
Agent({
  description: "QA Playwright pra feat/${ticket_lower}",
  subagent_type: "bens-qa-runner",
  prompt: "Input: { feature_description: '${ticket_title} — ${ticket_brief}', urls: ${urls_inferred_from_diff}, viewports: ['mobile-375', 'desktop-1440'], dark_mode: true, a11y: true }. Server up em localhost:3000. Worktree: ${worktree_path}. Produzir QA report markdown."
})
```

`urls_inferred_from_diff` — heurística determinística:

1. Se diff tem `apps/web/src/app/**/page.tsx` tocados: URLs = path do page sem o prefixo `apps/web/src/app` (ex: `apps/web/src/app/(dashboard)/clients/[id]/edit/page.tsx` → `/clients/{id}/edit` com placeholder).
2. Senão, se diff tem `apps/web/src/features/<feature>/components/*.tsx`: buscar via `grep -rl "from '@/features/${feature}'" apps/web/src/app/` o(s) page.tsx que consome(m) esse feature. URLs = paths daqueles pages.
3. Se nenhum dos casos acima resolver (ex: hook/lib em features sem consumer detectável): marcar `qa_skipped: true`, `qa_skip_reason: "no_url_inferred"`, log warning, seguir pra Phase 9.

**Inline fallback (se bens-qa-runner missing):** main session usa Playwright MCP diretamente seguindo system prompt de `bens-qa-runner.md`.

**Known issue: Playwright MCP lock em selectors complexos.** Memory: [[qa-failure-recovery-offer-alternatives]]. Se MCP responder com lock error (`ref=`, `getBy`, etc.) ou travar mid-session: (a) NÃO é bug de código, (b) é flakiness do MCP. Recovery — oferecer alternativas imediatamente via `AskUserQuestion`: (1) static QA via unit tests + code audit (aceitável se 0 CRITICAL no review + gates verdes), (2) skip + post-merge manual verification documentado no PR body. **NÃO re-dispatchar o mesmo prompt.** Observado em SCRUM-73 e SCRUM-74; pattern recorrente.

#### 8.4 — Avaliar report

1. Se report tem **0 CRITICAL** → seguir pra Phase 9 (WARNING e INFO viram TODO no PR body).
2. Se report tem **>0 CRITICAL** → **failure dispatch** com type `qa playwright failure`:
   - Dispatch `bens-qa-fixer` com payload (qa_report + critical_items + screenshots paths)
   - Inline fallback: main session aplica fixes seguindo system prompt de `bens-qa-fixer.md` + carregando skills `frontend-design` + `web-design-guidelines`
   - Após fix: re-dispatch `bens-qa-runner` pra confirmar verde
   - Max 3 tentativas; depois escalate_user com QA report final

#### 8.4.1 — Recovery quando QA é rejeitada/falha por env (NÃO re-dispatchar mesmo prompt)

Se o dispatch do `bens-qa-runner` foi rejeitado pelo user OU falhou por env (server não respondeu, login não funciona, etc.), **NÃO re-dispatchar com prompt idêntico** após corrigir env. Memory: [[qa-failure-recovery-offer-alternatives]] — em SCRUM-73 user percebeu como loop quando re-disparei após fixar :3001.

Recovery correto via `AskUserQuestion`:

| Opção                                       | Quando aplicar                                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fix local + QA pós-merge no main**        | Refactor visual baixo risco, code review 0 CRITICAL, gates verdes                                                                                                         |
| **Skip + merge agora, regressão em main**   | Mesmo caso acima, user prefere fechar PR rápido                                                                                                                           |
| **Re-dispatch com prompt FOCADO diferente** | Só se houver um cenário específico pra testar (ex: "abrir só /login em dark mode pra confirmar `--auth-foreground`") — prompt DEVE ser visivelmente diferente do anterior |
| **Abortar orchestrator**                    | Bloqueador real; user resolve manualmente                                                                                                                                 |

Default em refactors visuais low-risk: opção 1 ou 2. Marcar `qa_skip_reason: "user_chose_skip_visual_refactor_low_risk"`.

#### 8.5 — Cleanup + state update

1. Matar processo do dev server iniciado pelo orchestrator: `pkill -f 'bens-seguros-${ticket_lower}.*next dev' || true` (filtro pelo path do worktree pra NÃO matar processo do main checkout se user estiver rodando). Skip esta etapa se o orchestrator não subiu dev server nesta execução (skip ou port-conflict-abort).
2. Atualizar state:
   - `completed_phases.push("QA_RUN")` (string simples)
   - `qa_skipped: <bool>` no root
   - Se skipped: `qa_skip_reason: "<one of: no_ui_changes | no_visible_changes | port_conflict_user_chose_skip | port_conflict_timeout | no_url_inferred | playwright_mcp_down>"`
   - `phase = "OPEN_PR"`

### Motivos de skip de QA (enumeração canônica)

Pra evitar inconsistência entre state files, esses são os únicos valores válidos pra `qa_skip_reason`:

| Valor                                      | Quando                                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no_ui_changes`                            | Diff não toca arquivos UI (Phase 8.1 — sem features/pages/layouts e sem components/ui/)                                                                   |
| `no_visible_changes`                       | Diff toca `components/ui/*.tsx` mas só atributos invisíveis (`aria-*`, `data-*`, `id`, `title`, `role`) — sem `className`/`render`/`children` (Phase 8.1) |
| `port_conflict_user_chose_skip`            | Porta :3000 ocupada, user escolheu opção (b)                                                                                                              |
| `port_conflict_timeout`                    | Porta :3000 ocupada, user não respondeu em 60s                                                                                                            |
| `no_url_inferred`                          | Diff toca UI mas heurística não conseguiu inferir URLs (Phase 8.3)                                                                                        |
| `playwright_mcp_down`                      | Playwright MCP retornou erro de conexão (ver "MCP failure handling")                                                                                      |
| `user_chose_skip_visual_refactor_low_risk` | Refactor visual baixo risco (0 CRITICAL no code review, gates verdes); user opta por QA pós-merge no main em vez de dispatch (Phase 8.4.1)                |

### Phase 9: OPEN_PR

1. Push branch:
   ```bash
   git push -u origin feat/${ticket_lower}
   ```
2. Criar PR com title formatado a partir do título do ticket + conventional commits prefix inferido por type (feature → `feat:`, bug → `fix:`, refactor → `refactor:`, chore → `chore:`). Scope opcional baseado em `scope`:
   - `frontend` → `feat(web): ...`
   - `backend` → `feat(server): ...`
   - `mixed` → `feat: ...`
3. Body template:

   ```markdown
   ## Summary

   ${ticket_id} — ${spec_title_one_liner}

   ${spec_summary_2_3_sentences}

   ## Mudanças

   ${task_summaries_from_plan}

   ## Test plan

   - [ ] pnpm lint && pnpm typecheck && pnpm test && pnpm build verdes
   - [ ] ${acceptance_criteria_as_checklist}
   - QA: ${qa_skipped ? 'skipped (' + qa_skip_reason + ')' : 'executado — ' + qa_report_summary}

   ## Code review

   ${code_reviewer_summary_or_link}

   ## Spec / Plan (local, gitignored)

   - Spec: ${spec_path}
   - Plan: ${plan_path}

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   ```

4. Comando: `gh pr create --title "${title}" --body "${body}"`.
5. PR body inclui rodapé com `🤖 Generated with [Claude Code](https://claude.com/claude-code)` (já no template acima).
6. Extrair `pr_number` da URL retornada (`pr_url.match(/\/pull\/(\d+)/)[1]`) e salvar no state.
7. Atualizar state: `pr_url`, `pr_number`, `completed_phases.push("OPEN_PR")`, `phase = "CI_WATCH"`.

### Phase 10: CI_WATCH

1. `gh pr checks ${pr_number} --watch` (background ou wait). Alternativa se `pr_number` faltar: `gh pr checks --watch` (gh CLI infere do branch atual).
2. Se todos verdes → seguir pra `AWAIT_MERGE`.
3. Se algum falhar → **failure dispatch** com type `ci pipeline failure`. Dispatcha **skill** `check-pipeline` (não subagent — é skill carregada inline na main session). Diagnose root cause, propor fix. Aplicar fix → commit → push → re-watch.
4. Após 3 rounds de CI failure não resolvido → escalate_user com diagnóstico estruturado.
5. Atualizar state: `completed_phases.push("CI_WATCH")`, `phase = "AWAIT_MERGE"`.

### Phase 11: AWAIT_MERGE (PR-5: passive watcher)

Orchestrator NÃO mergeia o PR — espera o user decidir. Como Claude Code não tem background polling, Phase 11 é resolvida via interação humana ou nova invocação.

1. Mensagem ao user: `"PR aberta em ${pr_url}. CI verde. Aguardando seu review + merge. Quando mergear, me avise dizendo 'PR mergeada' (ou re-invoque /work SCRUM-XX) que eu rodo after-action."`
2. **Trigger atual (v1):** main session detecta a mensagem do user com keyword `mergeada` / `merged` + ticket_id no contexto, OU na próxima vez que `/work ${ticket_id}` é invocado (lê state file, vê `phase = "AWAIT_MERGE"`, checa `gh pr view ${pr_number} --json state`).
3. **Trigger planejado (v2 — out of scope deste PR):** slash command dedicado `/work-finish ${ticket_id}` que dispara apenas phases 12-14.
4. Atualizar state imediatamente após disparo: `phase = "AWAIT_MERGE"`, `paused_reason = "awaiting_pr_merge"`. Antes de seguir pra Phase 12: confirmar via `gh pr view ${pr_number} --json state,mergedAt` que retorna `MERGED` + ler `mergedAt` pra salvar em `pr_merged_at`.
5. Quando confirmado MERGED → seguir pra Phase 12 (state update com `pr_merged_at`, `paused_reason = null`).

**Implementação simplificada PR-5:** orchestrator considera Phase 11 completa quando user volta dizendo "PR mergeada" ou quando `gh pr view ${pr_number} --json state` retorna `MERGED` na próxima checagem (manual ou automática). Phases 12-14 podem rodar numa sessão diferente (state file persistido pra retomada).

### Phase 12: AFTER_ACTION (PR-5: dispatch `bens-after-action`)

Análise pós-PR pra propor melhorias ao harness.

1. Coletar contexto completo:
   ```
   payload = {
     ticket, slug, pr_url, pr_state ("MERGED" | "CLOSED"),
     spec_path, plan_path,
     started_at, ended_at: now,
     phase_durations: {...},  // derivar de timestamps no state
     failures: state.failures,
     user_interventions: state.user_interventions,
     commits: git log origin/main..feat/${ticket_lower},
     files_changed: git diff --name-only,
     review_findings: <do Phase 7 report>,
     qa_findings: <do Phase 8 report ou null>
   }
   ```
2. Dispatchar `bens-after-action`:
   ```
   Agent({
     description: "After-action review SCRUM-XX",
     subagent_type: "bens-after-action",
     prompt: "Input: <payload acima>. Produzir learning report em .claude/harness-learnings/${date}-${slug}.md + proposal JSON com memory_entries_to_create e repo_changes."
   })
   ```
   Inline fallback: main session lê system prompt do `bens-after-action.md` + aplica rubric manualmente.
3. Receber output:
   - Arquivo `.claude/harness-learnings/${date}-${slug}.md` committed
   - Proposal JSON com `memory_entries_to_create[]` e `repo_changes[]`
4. Validar proposal:
   - Conferir cooldown (regra: se mesma mudança foi sugerida em 2 PRs anteriores e rejeitada — buscar git log por `chore(harness): ` closed sem merge — NÃO repetir)
   - Soft cap: se proposal tem >5 mudanças, dividir em N PRs por escopo (skill / agent / CLAUDE.md / hook). Em PR-5 v1, simplificar: se >5, escalar ao user pra decidir como dividir.
5. Atualizar state: `completed_phases.push("AFTER_ACTION")`, `phase = "APPLY_LEARNINGS"`.

### Phase 13: APPLY_LEARNINGS (PR-5: aplicar proposal)

#### 13.1 — Memory auto-commit (user-local)

Pra cada entry em `memory_entries_to_create[]`:

1. Path: `~/.claude/projects/-home-artur-projects-bens-seguros/memory/${frontmatter.name}.md`
2. Escrever arquivo com frontmatter + body conforme CLAUDE.md auto memory section
3. Atualizar `~/.claude/projects/-home-artur-projects-bens-seguros/memory/MEMORY.md` adicionando uma linha pointer no formato `- [Title](file.md) — one-line hook`
4. NÃO usa git commit (memory é fora do repo do bens-seguros)
5. Log: `memory: created ${entries.length} entries`

#### 13.2 — Repo PR separada (se há `repo_changes[]`)

Se proposal tem 1+ items em `repo_changes`:

1. Main session: voltar pro main checkout (`cd /home/artur/projects/bens-seguros`)
2. Verificar tree limpo (refuse se não — escalate "Tree não-limpo no main checkout, não consigo abrir chore PR. Faça stash/commit").
3. `git fetch origin && git switch main && git pull`
4. Criar branch: `git switch -c chore/harness-after-${ticket_lower}`
5. Pra cada item em `repo_changes[]`: aplicar diff via Edit no path indicado
6. Quality gates: `pnpm lint` + `pnpm typecheck` (gates leves; sem tocar código de produto)
7. Commit:

   ```
   git add ${files} && git commit -m "chore(harness): learnings from ${ticket}

   <one-line summary>

   Generated by bens-after-action.

   Learning report: .claude/harness-learnings/${date}-${slug}.md

   Co-Authored-By: Claude bens-orchestrator <noreply@anthropic.com>"
   ```

8. `git push -u origin chore/harness-after-${ticket_lower}`
9. `gh pr create` com label `harness-learning` (criar label se necessário; soft fail se permissão falhar) + body apontando pro learning file
10. Atualizar state: salvar `harness_pr_url` no root.

Se `repo_changes` vazio: skip 13.2 inteiro. Logar `harness: no repo changes proposed`.

#### 13.3 — State update

1. `completed_phases.push("APPLY_LEARNINGS")`, `phase = "TEARDOWN"`.

### Phase 14: TEARDOWN (PR-5: cleanup)

1. Voltar pro main checkout: `cd /home/artur/projects/bens-seguros`
2. Remove worktree: `git worktree remove ../bens-seguros-${ticket_lower}` — falha → logar warning, NÃO bloqueia.
3. Delete branch local: `git branch -D feat/${ticket_lower}` (com `|| true` pra não bloquear se não existir).
4. **Verificar remote branch:** `gh pr view ${pr_number} --json headRefName,state` — se PR foi mergeada via squash/rebase, GitHub geralmente deleta o head branch automaticamente (depende da config "Automatically delete head branches"). Confirmar via `git ls-remote origin feat/${ticket_lower}` → se ainda existe, deletar: `git push origin --delete feat/${ticket_lower} || true`. Não bloqueia.
5. Atualizar state final: salvar `.orchestrator-state.json` no main checkout em `.claude/harness-learnings/${date}-${slug}.state.json` pra auditoria histórica. Worktree state file é deletado junto com o worktree.
6. Mensagem ao user: `"Orchestrator completed for ${ticket}. Summary: ${pr_url} merged, learnings em .claude/harness-learnings/${date}-${slug}.md. ${harness_pr_url ? 'Harness PR pra revisar: ' + harness_pr_url : 'Sem repo changes propostos.'}"`
7. Logar `phase = "DONE"` no log de sessão (state file já não existe no worktree).

## Failure dispatch — execução detalhada (PR-3)

Quando uma phase gate falha (Phase 6, 7, 8, 10), orchestrator dispatch um specialist via Agent tool. **Esta seção amplia a "Failure dispatch" anterior (linhas ~63-105) — leia-as como complementares. A tabela "Mapeamento failure → specialist" lá em cima é authoritative pra mapping subagent + recursos; a tabela abaixo só adiciona a coluna "Inline fallback" (degraded mode).**

### Padrão de invocação

```
Agent({
  description: "Fix <failure_type>",
  subagent_type: "<specialist_id>",  // ex: bens-test-fixer
  prompt: "<input_json> + worktree path + max_retries=3"
})
```

Após cada invocation: re-rodar o gate que falhou. Se verde → continue. Se vermelho após 3 tentativas → escalate_user com tried[] details.

### Specialists por failure type

| Failure type            | Specialist                     | Inline fallback (se subagent unavailable)                                                                                 |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `lint failure`          | `bens-test-fixer`              | Main session aplica fixes seguindo `bens-code-rules`                                                                      |
| `typecheck failure`     | `bens-test-fixer`              | Mesmo                                                                                                                     |
| `test failure`          | `bens-test-fixer`              | Mesmo + `superpowers:test-driven-development`                                                                             |
| `build failure`         | `bens-test-fixer`              | Mesmo (tipo/import não capturado por typecheck)                                                                           |
| `hook block`            | `bens-hook-resolver`           | Main session interpreta hook output + aplica fix (remover any, trocar console.log por Pino, etc.)                         |
| `code review CRITICAL`  | `bens-review-applier`          | Main session aplica CRITICAL items do report; WARNING/INFO viram TODO no PR body                                          |
| `qa playwright failure` | `bens-qa-fixer`                | Main session aplica fixes UI seguindo `frontend-design` + `web-design-guidelines`; re-roda Playwright pra confirmar verde |
| `ci pipeline failure`   | (skill) `check-pipeline`       | Main session carrega skill, diagnose, fix                                                                                 |
| `arch decision needed`  | (none — escalate user)         | `AskUserQuestion` com opções                                                                                              |
| `unknown failure type`  | (none — escalate_user_unknown) | After-action propõe novo specialist na PR `chore(harness): ...`                                                           |
| `subagent_unavailable`  | (none — fallback inline)       | Main session executa o trabalho que seria do subagent                                                                     |

### Estado em failure

Toda failure resulta em entry no `failures` array:

```json
{
  "phase": "LOCAL_GATES",
  "type": "test failure",
  "attempts": 1,
  "specialist": "bens-test-fixer", // ou "inline_fallback"
  "raw_output_summary": "FAIL: src/foo.spec.ts ...",
  "resolved": false,
  "started_at": "...",
  "resolved_at": null
}
```

Após 3 tentativas sem resolução: orchestrator escalate_user (marca PR draft se já existe, comenta no PR explicando, salva state, pinga user).

## State management — `.orchestrator-state.json`

### Quando criar/atualizar

- **Phase 0 (setup):** criar com estado inicial após mkdir worktree.
- **Após cada phase:** atualizar campos relevantes + push em `completed_phases`.
- **Em falha:** push entry em `failures`.
- **Em user intervention:** push entry em `user_interventions`.
- **Em abort:** set `aborted_at`.

### Estado inicial (Phase 0)

```json
{
  "ticket": "SCRUM-XX",
  "slug": null,
  "type": null,
  "scope": null,
  "phase": "READ_TICKET",
  "started_at": "<ISO timestamp>",
  "spec_path": null,
  "plan_path": null,
  "pr_url": null,
  "pr_number": null,
  "pr_merged_at": null,
  "harness_pr_url": null,
  "completed_phases": [],
  "failures": [],
  "user_interventions": [],
  "paused_reason": null,
  "aborted_at": null,
  "qa_skipped": null,
  "qa_skip_reason": null
}
```

**Campos derivados (NÃO persistidos no state):** `ended_at` e `phase_durations` são derivados no momento de construir o payload pra `bens-after-action` (Phase 12). Não persistir evita drift entre state writes — `ended_at` é "agora" e `phase_durations` é calculado a partir dos timestamps em `completed_phases` se rastreados, ou inferido de logs de TaskCreate.

### Read protocol (em reentrada de `/work SCRUM-XX`)

1. Se worktree existe (`../bens-seguros-${ticket_lower}/`):
   - Ler `.orchestrator-state.json`
   - Se `aborted_at != null` → perguntar "Worktree abortada em ${aborted_at}. Recomeçar?"
   - Se `phase != null && aborted_at == null` → perguntar "Worktree em phase ${phase}. Retomar ou recomeçar?"
2. Se "retomar": pular phases em `completed_phases`, continuar do `phase` atual.
3. Se "recomeçar": apagar state file, começar do Phase 0.

### Write protocol

Sempre Edit ou Write o arquivo INTEIRO (não append). JSON deve ser válido após cada update — re-serializar do objeto em memória.

## Subagents (catálogo)

Phase subagents (executam phases específicas):

- `bens-jira-reader` — Phase 1 (READ_TICKET)
- `bens-spec-author` — Phase 3 (BRAINSTORM_SPEC)
- `bens-plan-author` — Phase 4 (WRITE_PLAN)
- `bens-qa-runner` — Phase 8 (QA_RUN)
- `bens-after-action` — Phase 12 (AFTER_ACTION)
- `bens-code-reviewer` — Phase 7 (CODE_REVIEW) — já existe (PR #290)

Failure specialists (executam fixes em falhas):

- `bens-test-fixer` — lint/typecheck/test
- `bens-hook-resolver` — hook blocks
- `bens-review-applier` — CRITICAL do reviewer
- `bens-qa-fixer` — UI failures

Ver `.claude/agents/bens-*.md` pra contrato completo de cada um.

## Princípios herdados (literatura de harness engineering)

1. **Guides + Sensors** — skills/CLAUDE.md previnem; hooks/lint/types/review/CI detectam.
2. **Specialist dispatch** — orchestrator é classificador, não fixer.
3. **Computacional > inferencial** — checks determinísticos primeiro.
4. **Erros viram sinal permanente** — toda falha alimenta memory ou skills.
5. **Apostas explícitas** — peças do harness são apostas; podem ser removidas com evolução do modelo.

## Relação com `bens-implementation-flow`

`bens-implementation-flow` continua sendo skill autoritativa pras 5 fases base (Análise → Implementação → Code Review → QA → Aprovação) em sessão manual. O orchestrator HERDA esse contrato e expande pra 14 phases com autonomia + after-action.

Sessão **sem** orchestrator (user pede "implementa Y"): segue `bens-implementation-flow` manualmente.
Sessão **com** orchestrator (`/work SCRUM-XX`): esta skill (state machine de 14 phases).

## Quando NÃO usar esta skill

- Mudanças triviais (1 linha, typo) — commit direto, sem orchestrator (memory: `no-pr-ceremony-for-trivial-cleanup`)
- Trabalho exploratório / research — não tem ticket ainda
- Spec/brainstorming standalone — usar `superpowers:brainstorming` direto
- Implementação manual de feature complexa que user quer dirigir — usar `bens-implementation-flow`

## Status de implementação

| PR          | Phases                                                                                                                                  | Status     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| PR-1 (#313) | state machine doc + 9 subagent scaffolds + `/work` + audit doc                                                                          | ✅ merged  |
| PR-2 (#314) | Phases 1-4 funcionais (READ_TICKET, CLASSIFY, BRAINSTORM_SPEC, WRITE_PLAN) + 2 checkpoints + state management                           | ✅ merged  |
| PR-3 (#315) | Phases 5-10 (IMPLEMENT, LOCAL_GATES, CODE_REVIEW, OPEN_PR, CI_WATCH) + failure dispatch + subagent availability check + inline fallback | ✅ merged  |
| PR-4 (#316) | Phase 8 (QA_RUN funcional via Playwright MCP) + bens-qa-fixer ativado + porta CORS handling                                             | ✅ merged  |
| PR-5        | Phases 11-14 (AWAIT_MERGE + AFTER_ACTION + APPLY_LEARNINGS + TEARDOWN — self-improvement loop completo)                                 | 🟢 este PR |

**Após PR-5 (orchestrator completo):** `/work SCRUM-XX` executa fluxo end-to-end Jira → PR aberta → CI verde → QA Playwright (se UI) → aguardar merge → after-action review → memory auto-commit + chore PR opcional → teardown worktree. Self-improvement loop fechado.

## Memory referenciada

- `autonomous-pr-flow-preference` — não pausar entre PRs em modo autônomo
- `autonomous-pr-flow-with-review` — review + CI verde obrigatórios mesmo em autônomo
- `prefer-worktree-for-infra-refactor` — usar worktree desde o início
- `worktree-env-symlink-for-prisma` — `.env` symlink no worktree
- `server-cors-pinned-to-3000` — porta :3000 fixa pra QA
- `qa-via-mcp-not-spec` — QA = Playwright MCP, não cria .spec.ts em tests/e2e/
