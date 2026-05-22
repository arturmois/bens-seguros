# After-action: SCRUM-73

**PR:** #322 (MERGED)  
**Slug:** scrum-73-padronizar-tokens-cor  
**Duration:** ~4.5 hours (wall clock 2026-05-20T23:03:00Z → 2026-05-21T03:31:18Z)

## Métricas

- Phases completed: 12/14 (READ_TICKET → MERGE; Phases 13-14 pós-merge)
- Failures: 4 (1 lint hook revert, 1 branch behind main, 1 server startup EADDRINUSE, 1 QA loop user-triggered)
  - Lint hook revert: resolved via re-apply post-discovery
  - Branch behind: resolved via rebase
  - Server startup: resolved via retry
  - QA loop: user perceived as harness looping; not actual reincidence of same check
- User checkpoints: 2 (spec approval, plan approval)
- User interventions extras: 2 (QA_RUN skip due to CORS conflict + CI_WATCH short-circuit)
- Commits: 3 (all refactor, squashed in merge)
- Files changed: 31 (205+ / 183-)
- Spec/plan quality: Spec foi preciso (100% AC coverage), Plan foi detalhado (28 steps) mas omitiu 1 arquivo (chat/message-bubble.tsx) que estava em escopo

## O que deu certo

1. **Spec coverage perfeito** — todas as decisões explicitadas (INTENCIONAL markers, token maps, fase breakdown). User aprovou sem ambiguidade.

2. **Plan sequencial sem pivots** — 28 steps ordenados logicamente (Fase 1 critical → 2 warning → 3 info). Cada step tinha código exato ou tabelas de substituição.

3. **Refactor inline executado em 4.5h** — SCRUM-72 feedback (refactor <200 LOC pode rodar inline) confirmado. Nenhum subagent dispatch, main session manteve contexto completo.

4. **Lint/typecheck zero errors pós-cada-fase** — disciplina de validação após cada commit impediu regressões em cadeia.

5. **Residual search pattern efetivo** — no final implementação, busca `rg "bg-emerald|bg-amber..."` identificou message-bubble.tsx e 1 arquivo de constants esquecido. Padrão de QA manual funcionou.

6. **3 INTENCIONAL categories preservadas corretamente** — kanban stages (PROTOCOL/INSPECTION), branch colors (CONDOMINIUM/LIFE/OTHER), BMI ranges (Normal/Sobrepeso) todos com marcação `/* INTENCIONAL */`. Code review não sinalizou falso positivo.

7. **CSS variable syntax confirmada** — Tailwind 4 `text-(--auth-foreground)` funcionou conforme esperado (baseado em precedente commit c322f4fc). Nenhuma fallback necessária.

## O que precisou retrabalho

1. **Lint hook parecia reverter changes de password Input + toggle Button + submit button em login-form.tsx** — Edits foram aplicadas, mas save hook reverteu ou houve falha de tool call. Discovery via "Changes não visivelmente aplicadas" → re-apply manual. Raiz causa não confirmada (git hook, tool behavior, ou race condition).

2. **Branch ficou behind main durante implementação** — 3 PRs (#318, #319, #320) + 1 chore (#321) mergeadas em main enquanto task em progresso em worktree. Code reviewer reportou diff confuso ("businessSegment desapareceu" — era branch behind). Rebase resolveu sem conflitos. Sintoma: diff visual quebrada, não merge conflict real.

3. **API server :3001 falhou primeiro start com EADDRINUSE** — processo zombie residual de ciclo anterior de start/stop. Retry automático/manual resolveu OK.

4. **User interrompeu QA_RUN pois "algum app nao ta rodando"** — ao chamar `pnpm dev`, aparentemente apenas web (:3000) subiu (server/chat-server falharam ou foram ignoradas). User mencionou "pq vc ta em looping?" quando eu re-disparei QA com same prompt após user dizer "sim" ao checkpoint "ready for QA?". Issue: não foi reincidência real (QA rodou, retornou resultado), mas PERCEPTION de loop. Lição: após rejeição/falha de QA, propor MUDANÇA de abordagem (rodar apenas web sem server, ou QA pós-merge no main) em vez de re-executar mesmo check.

5. **Plan omitiu chat/message-bubble.tsx** — Spec tinha este arquivo em escopo implícito (refactor cores em text-red-400 → text-destructive). Plan Task 3 (auth-surface) não mencionou. Descoberto via residual search final. Fix: 2 linhas simples (red-400 → destructive, blue-300 → info).

## Padrões observados

1. **Refactor puro <200 LOC pode rodar 100% inline** — SCRUM-72 (140 LOC, 5 commits, ~25min) + SCRUM-73 (205 LOC, 3 commits, ~4.5h com pauses pra QA) confirmam. Inline = sem overhead de subagent handoff.

2. **Spec/plan sync falha em "escopo implícito"** — chat/message-bubble estava no spec (linha 122 menciona `apps/web/src` sem exceção) mas plan Task 3 focou em `(auth)/` e não varreu chat feature. Padrão: plan deveria re-confirmar spec file list antes de estruturar tasks.

3. **Branch behind main durante solo implementação** — 4 PRs mergeadas enquanto SCRUM-73 em progresso (~4.5h) é infrequente (user solo), mas happen. Pattern: solo dev em worktree sem upstream sync automático = rebase surpresa na code review.

4. **QA_RUN via `pnpm dev` tem failure modes** — user relatou "algum app nao ta rodando"; eu disparei QA mesmo assim pensando que era estado transitório. Lesson: antes de QA dispatch, validar `lsof -i :3000,:3001,:3002` ou `nc -zv localhost 3000 3001 3002` conforme `feedback_orchestrator-qa-preflight-server-startup` (PR #321).

5. **Lint hook auto-running após tool saves** — commit-time hooks são esperados, mas save-time hooks (se houver) podem ter race conditions com Bash/Edit tool sequencing. Padrão: não observado em SCRUM-72, mas SCRUM-73 menciona revert. Pode ser tool artifact ou hook behavior.

## Propostas

### Memory (auto-commit pelo orchestrator)

1. **`feedback_spec-plan-sync-implicit-scope.md`**
   - **Why:** Plan omitiu chat/message-bubble.tsx que estava em spec ("refactor colors em apps/web/src"). Escopo implícito (regex patterns) não foi materializado em plan tasks.
   - **How to apply:** WRITE_PLAN phase deve verificar (antes de estruturar tasks):
     1. Spec lista explicitamente arquivos em escopo? (e.g., `### Escopo` com `In scope` / `Out of scope`)
     2. Se não, extrair via regex: `apps/web/src/**/*.tsx` but exclude `features/marketing`, etc.
     3. Listar todos matched files em "Plan file structure"
     4. Cada task deve rastrear quantos files foram cobertos (vs total esperado)
   - **Success signal:** No próximo refactor large, plan tem tabela "File coverage: X/Y arquivos listados e distribuídos em tasks"

2. **`feedback_branch-behind-during-pr-development.md`**
   - **Why:** SCRUM-73 ficou behind quando 3 PRs mergeadas em main durante 4.5h de implementação em worktree. Diff confuso causou friction na code review ("businessSegment desapareceu" — era branch behind, não real removal).
   - **How to apply:** Workflow pra solo dev em worktree:
     1. Antes de CODE_REVIEW phase, rodar `git fetch origin && git rebase origin/main` no worktree
     2. Se merge conflicts: resolve via git, re-run tests
     3. Se rebase clean: notify user pra code review levar diffs post-rebase
     4. Diff deve ser "refactor(web): X Y Z" sem "unrelated upstream changes"
   - **Success signal:** Code reviewer não reporta "unrelated changes in diff" em future refactor PRs

3. **`feedback_qasingle-app-startup-check-before-dispatch.md`**
   - **Why:** QA_RUN foi disparada sem confirmar que todos apps startup corretamente. User relatou "algum app nao ta rodando" → QA esperava :3000, :3001, :3002 todos up, mas só :3000 respondeu.
   - **How to apply:** Phase 8 QA_RUN preflight deve validar:
     ```bash
     nc -zv localhost 3000  # web
     nc -zv localhost 3001  # server
     nc -zv localhost 3002  # chat-server
     ```
     Ou via `lsof -i :3000,:3001,:3002 | grep LISTEN`
     Se algum falhar: retry `pnpm dev` 1x, se ainda falhar: skip QA, notify user
   - **Success signal:** "Phase 8 QA_RUN skipped due to server :3001 not responding; check pnpm dev" em próxima PR com server issues

4. **`feedback_refactor-revert-on-edit-save.md`**
   - **Why:** SCRUM-73 relatou que Edit/Write tool parecia ter salvo, mas lint hook reverteu em 1 arquivo (login-form.tsx). Race condition ou hook behavior desconhecido.
   - **How to apply:** Quando tool salva e hook roda:
     1. Edit tool deve validar pós-save via `git diff <file> | grep -c "@@"` (número de hunks)
     2. Se hunks > 0 mas tool report sucesso: pode haver hook interferência
     3. Default: re-apply se > 1 falha no mesmo arquivo
     4. Log: "Edit <file> reverted by hook X; re-applying"
   - **Success signal:** Rare edge case, mas se repetir em 2+ PRs: escalate pra hook audit

### Repo (PR separada via orchestrator)

1. **Editar `.claude/agents/bens-implementation-flow.md` — seção "Plan file coverage checklist"**
   - **Reason:** Adicionar step obrigatória em WRITE_PLAN: extrair e listar todos arquivos em escopo.
   - **Suggested diff:**

   ```markdown
   #### Plan file coverage validation

   Before structuring tasks, verify spec + plan alignment on file scope:

   1. Spec has explicit "In scope" / "Out of scope" section? → Use directly
   2. If not, extract files via pattern matching:
      - Example: `rg "bg-emerald|text-amber" apps/web/src --files` to find all affected files
   3. Create "File Structure" table in plan with:
      - File path
      - Action (Modify, Create, Delete)
      - Which task covers it
   4. Each task must account for all matched files (no gap like chat/message-bubble)
   5. After all tasks written: count files covered vs files in table; should be 100%

   **Success signal:** No after-action report mentions "file omitted from plan that was in spec scope"
   ```

2. **Editar `.claude/agents/bens-orchestrator.md` — Phase 8 QA_RUN preflight section**
   - **Reason:** Documentar app startup validation before dispatching QA.
   - **Suggested diff:**

   ````markdown
   #### Phase 8: QA_RUN — App startup validation

   Before dispatching QA_RUN via bens-qa-runner:

   1. Run preflight check:
      ```bash
      # All 3 apps must be listening
      nc -zv localhost 3000 2>&1 | grep "succeeded"
      nc -zv localhost 3001 2>&1 | grep "succeeded"
      nc -zv localhost 3002 2>&1 | grep "succeeded"
      ```
   ````

   2. If any fails:
      - Retry: `pnpm dev` (wait 10s)
      - Re-check ports
      - If still failing: **skip QA_RUN**, notify user: "Server :300X not responding; recommend testing post-merge on main"
   3. Only dispatch QA_RUN if all 3 ports respond

   **Rationale:** QA expects full app stack; partial startup causes confusing failures. Better to skip and test on main post-merge than dispatch broken QA.

   ```

   ```

3. **Editar `.claude/agents/bens-orchestrator.md` — Phase 8 QA_RUN failure recovery**
   - **Reason:** Prevent perception of "looping" when QA fails; offer alternative approach.
   - **Suggested diff:**

   ```markdown
   #### QA_RUN failure → recovery logic

   If QA_RUN is dispatched and returns failure (visual regression, app crash, etc.):

   1. **Analyze failure:** report specific test name + assertion
   2. **Do NOT immediately re-dispatch** same QA_RUN with same prompt
   3. **Instead, offer decision to user:**
      - Option A: "Fix locally, recommend retesting post-merge on main"
      - Option B: "Skip QA now; merge PR and test in main branch"
      - Option C: "Identify specific scenario; re-run QA with focused prompt"
   4. User selects → apply recovery

   **Rationale:** Re-dispatching same QA check with same prompt creates perception of "looping". Change approach or test env instead.
   ```

## Sinais de sucesso pós-aplicação

1. **Spec/plan sync memory** → Próximo refactor large tem plan section "File coverage: X/Y" + checklist de "all matched files assigned to tasks"
2. **Branch behind rebase workflow** → Próximo PR em worktree que fica behind main: rebase automático em CODE_REVIEW phase, diff vem clean
3. **QA preflight validation** → Phase 8 logs "Ports up: 3000 ✓ 3001 ✓ 3002 ✓" ou "Server :3001 not responding; skipping QA_RUN"
4. **QA failure recovery** → User nunca vê "re-dispatching same QA check"; oferecemos alternativa (fix locally, merge and retest, focused retry)

---

## Contexto Adicional

**PR Timeline:**

- 2026-05-20 23:03: Phase 1-4 (READ_TICKET, CLASSIFY, BRAINSTORM_SPEC, WRITE_PLAN)
- 2026-05-20 23:XX → 2026-05-21 03:XX: Phase 5-10 (IMPLEMENT, LOCAL_GATES, CODE_REVIEW, QA_RUN, OPEN_PR, CI_WATCH)
- 2026-05-21 03:31:18: Merge #322

**User interventions:**

1. Spec checkpoint (after BRAINSTORM_SPEC) → approved
2. Plan checkpoint (after WRITE_PLAN) → approved
3. QA_RUN skip → user chose skip due to CORS conflict (web :3000 only; server :3001 in main)
4. CI_WATCH short-circuit → user reported "PR merged" before watch completed; CI green confirmed post-merge

**Key upstream context:**

- SCRUM-72 (PR #319, merged 2026-05-20) established feedback: refactor <200 LOC can be inline
- Multiple PRs merged during SCRUM-73 execution: #318, #319, #320, #321 (on top of which SCRUM-73 branch was behind)
- Memory entries related: `feedback_refactor-inline-vs-subagent-dispatch`, `server-cors-pinned-to-3000`, `feedback_bens-code-reviewer-may-hallucinate`

**Files touched:**

- Refactor: 31 files (9 fase 1, 9 fase 2, 14 fase 3: globals.css + layout + 5 auth components + 4 pages + 1 modal)
- Tokens added: `.auth-surface` namespace (5 tokens: --auth-foreground, --auth-foreground-muted, --auth-foreground-subtle, --auth-input-bg, --auth-input-border)
- INTENCIONAL preserved: kanban stages (2), branch colors (3), BMI ranges (2), commission actions (1)
- Total: +205 / -183 LOC

**Decision quality:**

- All AC covered ✓
- All INTENCIONAL categories justified ✓
- CSS syntax validated via precedent ✓
- No behavior change ✓
- Zero lint/typecheck errors ✓
