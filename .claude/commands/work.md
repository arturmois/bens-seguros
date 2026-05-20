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

## Status de implementação

- [x] **PR-1** (#313, merged): scaffold + state machine doc + 9 subagents + `/work` + audit doc
- [x] **PR-2** (este PR): phases 1-4 funcionais — `/work SCRUM-XX` lê ticket, gera spec, gera plan, com 2 checkpoints
- [ ] PR-3: phases 5-10 (IMPLEMENT, LOCAL_GATES, CODE_REVIEW, OPEN_PR, CI_WATCH) + 3 failure specialists
- [ ] PR-4: phase 8 (QA_RUN) + bens-qa-fixer
- [ ] PR-5: phases 12-13 (after-action + self-improvement loop)

Após este PR mergeado, `/work SCRUM-XX` executa Jira → spec → plan end-to-end com 2 pausas pra aprovação humana (após spec, após plan). Ao chegar em phase 5 (IMPLEMENT), retorna pro user com instruções pra implementação manual via `superpowers:subagent-driven-development` (ou aguardar PR-3).
