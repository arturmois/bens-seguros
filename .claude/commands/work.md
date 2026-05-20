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

## Status de implementação (PR-1 entrega scaffold; lógica funcional vem nos PRs seguintes)

- [ ] PR-2: Conectar phases 1-4 (jira-reader, spec-author, plan-author)
- [ ] PR-3: Conectar phases 5-10 (implement, gates, review, PR, CI watch) + 3 failure specialists
- [ ] PR-4: Conectar phase 8 (QA runner + qa-fixer)
- [ ] PR-5: Conectar phases 12-13 (after-action + learnings)

Até PR-2 mergeada, `/work SCRUM-XX` retorna mensagem "Orchestrator scaffolded but not yet functional. PR-2 implements phases 1-4. See spec."
