# Harness audit — bens-seguros

Snapshot do estado do harness do projeto bens-seguros + gap analysis pra suportar o `bens-orchestrator` (spec local: `docs/superpowers/specs/2026-05-19-bens-orchestrator-design.md`).

## Update history

| Data       | Update                                                                                                                                                                                                                                                                                                                     | PR             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 2026-05-19 | Audit inicial: 11 gaps mapeados. Scaffold de 9 subagents + skill + slash + audit doc + harness-learnings/ commitado.                                                                                                                                                                                                       | #313 (merged)  |
| 2026-05-20 | Phases 1-4 funcionais: orchestrator skill com Execution flow detalhada + state management JSON. `bens-jira-reader`, `bens-spec-author`, `bens-plan-author` validados via system prompt completo + integração com state machine.                                                                                            | #314 (merged)  |
| 2026-05-20 | Phases 5-10 funcionais: IMPLEMENT + LOCAL_GATES + CODE_REVIEW + OPEN_PR + CI_WATCH com failure dispatch detalhado. Subagent availability check (Pré-condição 5) + fallback inline pra resolver `orchestrator-subagent-restart-required`. PR template Body + test/hook/review failure specialists ativados.                 | #315 (merged)  |
| 2026-05-20 | Phase 8 (QA_RUN) funcional via Playwright MCP. `bens-qa-runner` dispatch + skip se diff não toca UI + porta CORS handling (3 opções pro user em conflito :3000). `bens-qa-fixer` ativado pra QA failures com re-run pra confirmar verde.                                                                                   | #316 (merged)  |
| 2026-05-20 | Phases 11-14 (AWAIT_MERGE + AFTER_ACTION + APPLY_LEARNINGS + TEARDOWN) funcionais. `bens-after-action` dispatch pós-merge com proposal estruturado. Memory auto-commit pra user-local + `chore(harness): ...` PR pra repo changes. Worktree teardown automático. **Orchestrator completo: self-improvement loop fechado.** | PR-5 (este PR) |

## Inventário (2026-05-19)

### Skills locais (`.claude/skills/`)

| Skill                         | Tipo           | Trigger                                    | Função                                                                              |
| ----------------------------- | -------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `bens-code-rules`             | local          | Code review / refactor / regras detalhadas | TypeScript, naming, SOLID, calisthenics, clean code, error handling, language rules |
| `bens-ddd-module`             | local          | Criar módulo DDD / use case / repository   | Estrutura, padrão `@injectable()`, mapper, prisma vs prismaAdmin, ordem TDD         |
| `bens-implementation-flow`    | local          | Implementar etapa de plano                 | 5 fases obrigatórias (Análise, Implementação, Code Review, QA, Aprovação)           |
| `bens-release`                | local          | Gerar versão / tag de prod                 | Fluxo trunk + tag-based                                                             |
| `check-pipeline`              | local          | CI quebrou / pipeline falhou               | Diagnose GH Actions failures                                                        |
| `find-skills`                 | symlink global | Discovery de skills                        | —                                                                                   |
| `frontend-design`             | symlink global | Criar UI / componentes                     | —                                                                                   |
| `ui-ux-pro-max`               | symlink global | UI/UX patterns                             | —                                                                                   |
| `vercel-react-best-practices` | symlink global | React/Next perf                            | —                                                                                   |
| `web-design-guidelines`       | symlink global | UI audit                                   | —                                                                                   |

### Subagents (`.claude/agents/`)

| Subagent             | Tools                              | Função                                        |
| -------------------- | ---------------------------------- | --------------------------------------------- |
| `bens-code-reviewer` | Read, Grep, Glob, Bash (allowlist) | Code review estruturado CRITICAL/WARNING/INFO |

### Slash commands (`.claude/commands/`)

| Command      | Função                            |
| ------------ | --------------------------------- |
| `/regen-api` | Regenera Orval client + typecheck |

### Hooks (`.claude/settings.json` + `.claude/hooks/`)

| Hook                          | Tipo                              | Função                                                                            |
| ----------------------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `check-forbidden-patterns.sh` | PreToolUse (Edit/Write/MultiEdit) | Bloqueia `any`, `console.log`, `eslint-disable`, `process.env` em paths proibidos |
| `db-reset-warning.sh`         | PreToolUse (Bash)                 | Avisa que RLS precisa ser reaplicada após `db:reset`                              |
| `stop-quality-gates.sh`       | Stop                              | Roda `pnpm typecheck && lint` nos packages tocados antes de claim "done"          |

### MCPs conectados

| MCP          | Função                                              |
| ------------ | --------------------------------------------------- |
| `atlassian`  | Jira (CRUD tickets) + Confluence (read/write pages) |
| `sentry`     | Read errors, traces, releases                       |
| `playwright` | Browser automation pra QA                           |
| `serena`     | Semantic code navigation (símbolos, refs)           |
| `context7`   | Library docs lookup                                 |
| `vercel`     | Deploy operations (mostly read-only)                |

### Memory system

- 30+ entries em `~/.claude/projects/-home-artur-projects-bens-seguros/memory/`
- Categorias: feedback (preferências do user), project (estado), reference (where to look), user (perfil)
- `MEMORY.md` index ativamente mantido

### CLAUDE.md

- ~250 linhas (após PR #290 slim)
- Contém: ABSOLUTE PROHIBITIONS, Language Rules, Naming, Git/CI, dev commands, pointers pra skills

## Gap analysis (capabilities pro `bens-orchestrator`)

| Capability                                                                   | Provedor existente                                            | Status                                                                                                                                |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Ler ticket Jira (descrição, comments, ACs, attachments)                      | Atlassian MCP                                                 | ✅ disponível                                                                                                                         |
| Ler Confluence linkado                                                       | Atlassian MCP                                                 | ✅ disponível                                                                                                                         |
| Buscar Sentry por erro relacionado                                           | Sentry MCP                                                    | 🟡 limitado — apenas auth handshake exposto; tools de query a confirmar em runtime (PR-2 descoberta; PR-5 after-action propõe ajuste) |
| Buscar código por símbolo                                                    | Serena MCP                                                    | ✅ disponível                                                                                                                         |
| Buscar docs de libs                                                          | Context7 MCP                                                  | ✅ disponível                                                                                                                         |
| Brainstorming → spec                                                         | `superpowers:brainstorming`                                   | ✅ disponível (global)                                                                                                                |
| Spec → plan                                                                  | `superpowers:writing-plans`                                   | ✅ disponível (global)                                                                                                                |
| Execução de plano                                                            | `superpowers:executing-plans` + `subagent-driven-development` | ✅ disponível (global)                                                                                                                |
| Worktree isolado                                                             | `superpowers:using-git-worktrees`                             | ✅ disponível (global)                                                                                                                |
| TDD                                                                          | `superpowers:test-driven-development`                         | ✅ disponível (global)                                                                                                                |
| Debug sistemático                                                            | `superpowers:systematic-debugging`                            | ✅ disponível (global)                                                                                                                |
| Verificação pré-completion                                                   | `superpowers:verification-before-completion`                  | ✅ disponível (global)                                                                                                                |
| Code review                                                                  | `bens-code-reviewer` (subagent local)                         | ✅ disponível                                                                                                                         |
| QA runner (Playwright)                                                       | `bens-qa-runner`                                              | ✅ funcional em PR-4 (este PR) — dispatched em Phase 8 com porta CORS handling                                                        |
| Jira reader wrapper                                                          | `bens-jira-reader`                                            | ✅ funcional em PR-2 (este PR)                                                                                                        |
| Spec author (subagent que aplica brainstorming sem perguntar excessivamente) | `bens-spec-author`                                            | ✅ funcional em PR-2 (este PR)                                                                                                        |
| Plan author (subagent que aplica writing-plans)                              | `bens-plan-author`                                            | ✅ funcional em PR-2 (este PR)                                                                                                        |
| After-action reviewer                                                        | `bens-after-action` (scaffold)                                | 🟡 scaffold (PR-1 #313); funcional em PR-5                                                                                            |
| Failure dispatch: test-fixer                                                 | `bens-test-fixer`                                             | ✅ funcional em PR-3 (este PR) — dispatched em LOCAL_GATES failure                                                                    |
| Failure dispatch: hook-resolver                                              | `bens-hook-resolver`                                          | ✅ funcional em PR-3 (este PR) — dispatched em hook block                                                                             |
| Failure dispatch: review-applier                                             | `bens-review-applier`                                         | ✅ funcional em PR-3 (este PR) — dispatched em CODE_REVIEW CRITICAL                                                                   |
| Failure dispatch: qa-fixer                                                   | `bens-qa-fixer`                                               | ✅ funcional em PR-4 (este PR) — dispatched em QA failure com re-run pra confirmar                                                    |
| Failure dispatch: CI pipeline                                                | `check-pipeline` (skill)                                      | ✅ disponível + dispatched em CI_WATCH failure (PR-3)                                                                                 |
| Orchestrator state machine                                                   | skill `bens-orchestrator`                                     | ✅ phases 1-10 (#315) + phase 8 funcional (PR-4 este PR); 11-14 em PR-5                                                               |
| Slash `/work SCRUM-XX`                                                       | `.claude/commands/work.md`                                    | ✅ phases 1-10 + QA_RUN em PR-4 (este PR)                                                                                             |
| Subagent availability check + inline fallback                                | skill `bens-orchestrator` Pré-condição 5                      | ✅ funcional em PR-3 (este PR) — fix pra `orchestrator-subagent-restart-required`                                                     |
| Persistência de learnings (diretório)                                        | `.claude/harness-learnings/`                                  | ✅ criado em PR-1 (#313)                                                                                                              |

## Recomendações de MCP / config

- **Nenhum MCP novo necessário pra PR-1.** Todos os 6 MCPs ativos cobrem as capabilities atuais.
- **Detecção de "PR mergeado" pra trigger after-action:** considerar hook `Stop` que cheque `gh pr view --json state` — out of scope PR-1, avaliar em PR-5.
- **Hook `Notification` quando orchestrator pausa pra arch decision:** out of scope; pode ser útil se o user ficar mais tempo fora da sessão.
- **`.gitignore` precisou de 2 negates novos** pra `harness-audit.md` e `harness-learnings/` (já aplicado em Task 1 deste PR).

## Atualizações no CLAUDE.md (recomendadas em PR-1)

- Adicionar 1 linha na seção "Para tarefas específicas, carregue a skill apropriada":
  > `Implementar ticket Jira de ponta a ponta (autônomo) → skill bens-orchestrator (via /work SCRUM-XX)`

Sem outras mudanças. CLAUDE.md continua slim.

## Métricas / observabilidade pós-launch (primeiras 4 semanas após PR-5)

Pra avaliar se o orchestrator vale o investimento (4 semanas após PR-5 mergeado):

- **Taxa de adoção:** % de tickets simples (bug fix, CRUD, refactor pequeno) que passaram pelo orchestrator
- **Tempo médio Jira → PR:** orchestrator vs manual
- **% PRs do orchestrator que precisaram intervenção fora dos checkpoints planejados**
- **% falhas resolvidas pelos specialists vs escaladas pro user**
- **Volume de PRs `chore(harness): ...` mergeados (sinal de self-improvement útil)**
- **Volume de PRs `chore(harness): ...` rejeitados (sinal de proposals ruins — investigar rubric)**
- **Crescimento de memory entries `feedback_*`** (esperado: cresce e estabiliza após ~15 tickets)
- **Custo de tokens médio por ticket do orchestrator** (alerta se > 300k tokens)

Sinal de hipótese errada: nenhum dos sinais positivos aparece em 4 semanas → rollback parcial ou aceitar que orchestrator não é o caminho. Ver spec seção "Sinais de sucesso pós-merge".

## Conclusão

**Orchestrator completo após PR-5.** 11 gaps mapeados em 2026-05-19, todos resolvidos em 5 PRs sequenciais (#313 → #314 → #315 → #316 → este PR). Estado final:

- PR-1 (#313): scaffold de 9 subagents + skill + slash + audit doc + harness-learnings/ — todos commitados
- PR-2 (#314): ativou phases 1-4 (jira-reader, spec-author, plan-author + 2 checkpoints + state management)
- PR-3 (#315): ativou phases 5-10 (IMPLEMENT, LOCAL_GATES, CODE_REVIEW, OPEN_PR, CI_WATCH) + 3 failure specialists (test-fixer, hook-resolver, review-applier) + subagent availability fallback
- PR-4 (#316): ativou phase 8 QA_RUN via Playwright MCP + qa-runner + qa-fixer + porta CORS handling
- PR-5 (este PR): ativa phases 11-14 (AWAIT_MERGE + AFTER_ACTION + APPLY_LEARNINGS + TEARDOWN) — self-improvement loop fechado

Nenhum MCP novo foi necessário. Próximo passo: usar `/work SCRUM-XX` em tickets reais e capturar learnings via after-action — o harness agora se mantém sozinho.
