---
description: Roda o orchestrator do bens-seguros num ticket Jira (Jira → spec → plan → implementação → PR → after-action). Argumento - ID do ticket, ex SCRUM-71. Carrega skill bens-orchestrator e segue state machine de 14 phases.
---

# /work {ticket-id}

Entry point do orchestrator autônomo do bens-seguros.

## Uso

```
/work SCRUM-71
```

## O que faz

1. Valida ticket ID (formato `[A-Z]+-\d+`). Inválido → erro.
2. Verifica working tree limpo. Não limpo → refuse com mensagem ("commit ou stash antes").
3. Carrega skill `bens-orchestrator` (state machine de 14 phases).
4. Executa o fluxo autônomo:
   - Phase 1: READ_TICKET (subagent `bens-jira-reader`)
   - Phase 2: CLASSIFY (inline)
   - Phase 3: BRAINSTORM_SPEC (subagent `bens-spec-author`) — pausa pro user aprovar
   - Phase 4: WRITE_PLAN (subagent `bens-plan-author`) — pausa pro user aprovar
   - Phase 5: IMPLEMENT (inline, com TDD)
   - Phase 6: LOCAL_GATES (pnpm lint + typecheck + test + build)
   - Phase 7: CODE_REVIEW (subagent `bens-code-reviewer`)
   - Phase 8: QA_RUN (subagent `bens-qa-runner`) — se features de UI
   - Phase 9: OPEN_PR (gh pr create)
   - Phase 10: CI_WATCH (gh pr checks --watch)
   - Phase 11: AWAIT_MERGE (passive)
   - Phase 12: AFTER_ACTION (subagent `bens-after-action`)
   - Phase 13: APPLY_LEARNINGS (memory auto-commit + opcional PR `chore(harness): ...`)
   - Phase 14: TEARDOWN (remove worktree)

Em falhas: dispatch pra failure specialist (`bens-test-fixer`, `bens-hook-resolver`, etc.) com max 3 tentativas; depois escala pro user.

## Pré-requisitos

- Ticket existe no Jira (Atlassian MCP funcional)
- Working tree limpo (sem mudanças não-commitadas)
- Em main checkout (não dentro de outro worktree)
- `gh` CLI autenticado pra GitHub
- pnpm + Node 22 LTS instalados

## Comportamento em erros

| Erro                                          | Comportamento                        |
| --------------------------------------------- | ------------------------------------ |
| Ticket ID inválido                            | Aborta com mensagem clara            |
| Working tree não-limpo                        | Refuse + sugestão (`git stash push`) |
| Worktree do ticket já existe                  | Pergunta retomar ou recomeçar        |
| Outro worktree de orchestrator ativo          | Pergunta pausar atual ou esperar     |
| Atlassian MCP indisponível                    | Retry em 60s; depois escala          |
| Após 3 falhas do specialist em qualquer phase | Marca PR como draft + escala user    |

## Spec

`docs/superpowers/specs/2026-05-19-bens-orchestrator-design.md` (local — gitignored)

## Skill carregada

`.claude/skills/bens-orchestrator/SKILL.md`

## Status de implementação (orchestrator completo após este PR)

- [x] **PR-1** (#313, merged): scaffold + state machine doc + 9 subagents + `/work` + audit doc
- [x] **PR-2** (#314, merged): phases 1-4 funcionais — Jira → spec → plan + 2 checkpoints
- [x] **PR-3** (#315, merged): phases 5-10 funcionais — IMPLEMENT → LOCAL_GATES → CODE_REVIEW → OPEN_PR → CI_WATCH + failure dispatch + subagent availability fallback
- [x] **PR-4** (#316, merged): phase 8 (QA_RUN) funcional via Playwright MCP + porta CORS handling
- [x] **PR-5** (este PR): phases 11-14 funcionais — AWAIT_MERGE + AFTER_ACTION (bens-after-action) + APPLY_LEARNINGS (memory auto-commit + chore PR) + TEARDOWN; self-improvement loop COMPLETO

Após este PR mergeado, `/work SCRUM-XX` executa o fluxo end-to-end completo (Jira → PR mergeada → after-action → harness improvements). **Pré-requisito importante:** abrir sessão NOVA do Claude Code antes do primeiro `/work` após mergear PR-5 (subagent `bens-after-action` precisa de session restart pra ficar invocável — memory: `orchestrator-subagent-restart-required`). Sem restart, orchestrator faz fallback inline.
