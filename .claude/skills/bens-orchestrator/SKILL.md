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

## Pré-condições (checadas antes de qualquer phase)

1. `ticket_id` válido (regex `^[A-Z]+-\d+$`)
2. Working tree limpo no main checkout (`git status --porcelain` vazio). NÃO limpo → refuse com mensagem; NÃO faz auto-stash.
3. `gh` autenticado (`gh auth status`)
4. Atlassian MCP responde (`mcp__plugin_atlassian_atlassian__getAccessibleAtlassianResources`)

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

## Status de implementação (este file é o scaffold de PR-1)

PR-1 entrega esta skill como **documentação completa do state machine** + scaffold dos 9 subagents. Lógica funcional vem nos PRs seguintes:

- PR-2: implementar phases 1-4 (READ_TICKET, CLASSIFY, BRAINSTORM_SPEC, WRITE_PLAN)
- PR-3: implementar phases 5-10 (IMPLEMENT, LOCAL_GATES, CODE_REVIEW, QA_RUN skip-by-default, OPEN_PR, CI_WATCH) + 3 failure specialists
- PR-4: implementar phase 8 (QA_RUN) + qa-fixer
- PR-5: implementar phases 12-13 (AFTER_ACTION, APPLY_LEARNINGS)

Até PR-2 mergeada, invocar `/work SCRUM-XX` é no-op (skill carrega mas state machine não dispatcha — pra evitar surpresas, o slash retorna mensagem "Orchestrator scaffolded but not yet functional. PR-2 implements phases 1-4. See spec.").

## Memory referenciada

- `autonomous-pr-flow-preference` — não pausar entre PRs em modo autônomo
- `autonomous-pr-flow-with-review` — review + CI verde obrigatórios mesmo em autônomo
- `prefer-worktree-for-infra-refactor` — usar worktree desde o início
- `worktree-env-symlink-for-prisma` — `.env` symlink no worktree
- `server-cors-pinned-to-3000` — porta :3000 fixa pra QA
- `qa-via-mcp-not-spec` — QA = Playwright MCP, não cria .spec.ts em tests/e2e/
