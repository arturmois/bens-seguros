# Harness audit — bens-seguros

Snapshot do estado do harness do projeto bens-seguros + gap analysis pra suportar o `bens-orchestrator` (spec local: `docs/superpowers/specs/2026-05-19-bens-orchestrator-design.md`).

## Update history

| Data       | Update                                                                                                                                                                                                                          | PR             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 2026-05-19 | Audit inicial: 11 gaps mapeados. Scaffold de 9 subagents + skill + slash + audit doc + harness-learnings/ commitado.                                                                                                            | #313 (merged)  |
| 2026-05-20 | Phases 1-4 funcionais: orchestrator skill com Execution flow detalhada + state management JSON. `bens-jira-reader`, `bens-spec-author`, `bens-plan-author` validados via system prompt completo + integração com state machine. | PR-2 (este PR) |

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
| QA runner (Playwright)                                                       | `bens-qa-runner` (scaffold)                                   | 🟡 scaffold (PR-1 #313); funcional em PR-4                                                                                            |
| Jira reader wrapper                                                          | `bens-jira-reader`                                            | ✅ funcional em PR-2 (este PR)                                                                                                        |
| Spec author (subagent que aplica brainstorming sem perguntar excessivamente) | `bens-spec-author`                                            | ✅ funcional em PR-2 (este PR)                                                                                                        |
| Plan author (subagent que aplica writing-plans)                              | `bens-plan-author`                                            | ✅ funcional em PR-2 (este PR)                                                                                                        |
| After-action reviewer                                                        | `bens-after-action` (scaffold)                                | 🟡 scaffold (PR-1 #313); funcional em PR-5                                                                                            |
| Failure dispatch: test-fixer                                                 | `bens-test-fixer` (scaffold)                                  | 🟡 scaffold (PR-1 #313); funcional em PR-3                                                                                            |
| Failure dispatch: hook-resolver                                              | `bens-hook-resolver` (scaffold)                               | 🟡 scaffold (PR-1 #313); funcional em PR-3                                                                                            |
| Failure dispatch: review-applier                                             | `bens-review-applier` (scaffold)                              | 🟡 scaffold (PR-1 #313); funcional em PR-3                                                                                            |
| Failure dispatch: qa-fixer                                                   | `bens-qa-fixer` (scaffold)                                    | 🟡 scaffold (PR-1 #313); funcional em PR-4                                                                                            |
| Failure dispatch: CI pipeline                                                | `check-pipeline` (skill)                                      | ✅ disponível                                                                                                                         |
| Orchestrator state machine                                                   | skill `bens-orchestrator`                                     | ✅ phases 1-4 em PR-2 (este PR); 5-14 em PR-3 a PR-5                                                                                  |
| Slash `/work SCRUM-XX`                                                       | `.claude/commands/work.md`                                    | ✅ phases 1-4 em PR-2 (este PR)                                                                                                       |
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

11 gaps identificados em 2026-05-19. PR-1 (#313) fechou todos como scaffold. PR-2 (este PR) traz 3 capabilities pra estado funcional completo (jira-reader, spec-author, plan-author) + orchestrator state machine pra phases 1-4. Restam 6 capabilities em estado scaffold pra serem ativadas em PR-3 (test-fixer, hook-resolver, review-applier + IMPLEMENT/LOCAL_GATES/CODE_REVIEW/OPEN_PR/CI_WATCH), PR-4 (qa-runner + qa-fixer) e PR-5 (after-action + APPLY_LEARNINGS). Nenhum MCP novo necessário.
