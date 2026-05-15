---
name: bens-implementation-flow
description: Use ao implementar uma etapa de plano em docs/superpowers/plans/, iniciar trabalho de feature/refactor não-trivial, ou quando o usuário pede "implementar X" / "fazer task Y". Define as 5 fases obrigatórias (Análise, Implementação, Code Review, QA, Aprovação) e quais skills carregar por contexto.
---

# Fluxo de implementação — 5 fases obrigatórias

## Processo de Implementacao por Etapa

Cada etapa (task) dos planos em `docs/plans/` segue este fluxo obrigatorio:

### Fase 1: Analise Pre-Implementacao

- **OBRIGATORIO:** Antes de escrever codigo, o agente DEVE ler e analisar a etapa completa
- Identificar ambiguidades, gaps, dependencias nao resolvidas ou contradicoes com outros documentos
- Se houver duvidas: **PERGUNTAR ao usuario antes de implementar** — nunca assumir
- Verificar se a etapa depende de algo que ainda nao foi implementado
- Cross-reference com: `ESPECIFICACAO-FINAL.md`, `CLAUDE.md`, `docs/UI-PATTERNS.md`, `docs/FRONTEND-PATTERNS.md`, `docs/ARCHITECTURE-DECISIONS.md`
- **Carregar skills e docs relevantes para a tarefa** (ver tabela abaixo)

### Fase 1b: Carregar Skills e Documentos por Contexto

**OBRIGATORIO:** O agente DEVE carregar as skills e ler os documentos relevantes ANTES de implementar. Skills contem regras, patterns e anti-patterns que evitam retrabalho.

| Contexto da Tarefa                      | Skills para Carregar                                                                       | Documentos para Ler                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **Frontend (componentes, pages, UI)**   | `frontend-design`, `vercel:shadcn`, `vercel-react-best-practices`, `web-design-guidelines` | `docs/UI-PATTERNS.md`, `docs/FRONTEND-PATTERNS.md`         |
| **Backend (routes, use cases, API)**    | `fastify-best-practices`, `auth-security-audit` (se auth), `orval` (se API client)         | `docs/ARCHITECTURE-DECISIONS.md`, `ESPECIFICACAO-FINAL.md` |
| **Database (schema, migrations, seed)** | —                                                                                          | `docs/ARCHITECTURE-DECISIONS.md` (GAP-2, GAP-5)            |
| **Monorepo (turbo, packages, build)**   | —                                                                                          | `docs/ARCHITECTURE-DECISIONS.md` (GAP-7)                   |
| **Testes**                              | `superpowers:test-driven-development`                                                      | `CLAUDE.md` secao Testing                                  |
| **Design System (cores, tokens, tema)** | `frontend-design`, `vercel:shadcn`                                                         | `docs/UI-PATTERNS.md` secao 1                              |
| **Formularios**                         | `frontend-design`, `vercel:shadcn`                                                         | `docs/UI-PATTERNS.md` secao 3                              |
| **Tabelas e DataTable**                 | `web-design-guidelines`                                                                    | `docs/UI-PATTERNS.md` secao 2                              |
| **Charts e Dashboard**                  | `web-design-guidelines`                                                                    | `docs/UI-PATTERNS.md` secao 1                              |
| **Auth e RBAC**                         | `auth-security-audit`                                                                      | `docs/ARCHITECTURE-DECISIONS.md` (AUTH-1 a AUTH-8)         |
| **Docker e Deploy**                     | `docker-expert`, `multi-stage-dockerfile`, `docker-compose-orchestration`                  | `docs/ARCHITECTURE-DECISIONS.md` (GAP-7)                   |
| **Code Review**                         | `superpowers:requesting-code-review`, `simplify`                                           | `CLAUDE.md` (todas as regras)                              |
| **Debug**                               | `superpowers:systematic-debugging`                                                         | —                                                          |
| **Planning**                            | `superpowers:writing-plans`                                                                | `docs/plans/`                                              |

**Regra:** Se a tarefa envolve frontend visual, as skills `frontend-design` e `web-design-guidelines` sao **obrigatorias**. Elas contem guidelines de design, audits de UI/UX, anti-patterns e checklists que o agente DEVE seguir. Ignorar skills resulta em codigo que nao segue os padroes definidos.

**Regra:** Se a tarefa envolve shadcn/ui, a skill `vercel:shadcn` e **obrigatoria**. Ela contem exemplos, composicoes e customizacoes do preset @coss/style.

**Regra:** Ao implementar componentes React/Next.js, SEMPRE carregar `vercel-react-best-practices`. Ela contem regras de performance priorizadas (waterfalls, bundle size, re-renders, hydration).

### Fase 2: Implementacao

- Seguir TDD quando aplicavel (DDD Full: obrigatorio)
- Commits frequentes (conventional commits)
- Respeitar todas as regras deste CLAUDE.md
- Aplicar as regras das skills carregadas na Fase 1b

### Fase 3: Code Review (agente reviewer)

- Apos implementacao, disparar agente de code review (`superpowers:code-reviewer`)
- Review verifica: SOLID, Clean Code, Object Calisthenics, seguranca, performance, aderencia a spec
- Itens criticos: zero `any`, zero `console.log`, zero `eslint-disable`, naming conventions, max 200 linhas
- Se reviewer reprovar: corrigir e re-submeter

### Fase 4: QA Review (Playwright via MCP)

- Apos code review aprovado, executar testes de QA via MCP Playwright
- Verificar: fluxo funcional end-to-end, 4 estados UI (Empty, Loading, Error, Success)
- Verificar: responsividade (mobile 375px + desktop 1440px), dark mode, acessibilidade basica
- Capturar screenshots para evidencia
- Se QA reprovar: corrigir, re-submeter ao code review, e re-executar QA

### Fase 5: Aprovacao

- **Etapa APROVADA quando TODOS passarem:**
  1. 5 Quality Gates (lint, typecheck, build, test, acceptance)
  2. Code Review aprovado (agente reviewer)
  3. QA Review aprovado (Playwright MCP)
- Somente apos aprovacao o agente pode avancar para a proxima etapa
- Se qualquer gate falhar: **parar, corrigir, re-submeter** — nunca pular

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────┐    ┌───────────┐
│   Analise   │───>│ Implementar  │───>│ Code Review │───>│  QA E2E   │───>│ Aprovado  │
│ (perguntar  │    │ (TDD, commits│    │ (reviewer   │    │(Playwright│    │ (next     │
│  se duvida) │    │  frequentes) │    │  agent)     │    │  MCP)     │    │  etapa)   │
└─────────────┘    └──────────────┘    └──────┬──────┘    └─────┬─────┘    └───────────┘
                          ^                   │                 │
                          │         reprovou  │       reprovou  │
                          └───────────────────┴─────────────────┘
```

## Quando NÃO usar esta skill

- Mudanças triviais (1 linha, typo, dependency bump) — skip o flow, commitar direto
- Trabalho exploratório (research, debug initial) — Fase 1 só
- Spec/brainstorming — usar `superpowers:brainstorming` ao invés

## Memory referenciada

- `no-pr-ceremony-for-trivial-cleanup` — quando pular o flow
- `autonomous-pr-flow-preference` — não pausar entre PRs em modo autônomo
- `autonomous-pr-flow-with-review` — review + CI verde obrigatórios mesmo em modo autônomo
- `qa-via-mcp-not-spec` — Fase 4 usa Playwright MCP, não cria specs em `tests/e2e/`
