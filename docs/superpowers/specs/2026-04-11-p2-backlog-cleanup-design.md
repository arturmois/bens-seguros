# Design — P2 Backlog Cleanup (4 PRs sequenciais)

**Data:** 2026-04-11
**Autor:** Brainstorm Claude + Artur
**Origem:** `audit/qa-report/REPORT.md` P2 section + backlog residual após PR #82 e PR #83
**Escopo:** Security audit + idempotência GETs + docs de convenção + refactor de 5 arquivos > 200L em `features/proposals/`

---

## 1. Contexto e motivação

Após os dois PRs anteriores (`refactor(web): unify dashboard list pages with ListPageHeader` #82 e `fix(web,server): server-side sort for proposals and insurers` #83), o backlog P2 do QA ainda tem 4 grupos de itens pendentes:

1. **Segurança** — auditoria de `localStorage` por vazamento de PII/tokens e validação de headers (Helmet/CSP) em produção
2. **Idempotência** — confirmar que todos os `GET /api/v1/*` são livres de side-effects (React Strict Mode double-fetch, retries)
3. **Documentação** — formalizar a convenção "FilterTabs vs Select" em `docs/UI-PATTERNS.md` (QA-P2-1)
4. **Manutenibilidade** — refactor dos 5 arquivos em `features/proposals/` que violam o limite de 200 linhas do `CLAUDE.md`

Estes itens são independentes entre si e não compartilham código. Cada um vira um PR isolado, executado em sequência (não paralelo) para manter rebase cheap.

---

## 2. Decisões tomadas no brainstorm

| ID  | Pergunta                             | Decisão                                                                                    |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| D-1 | Como fatiar?                         | **4 PRs separados em sequência**                                                           |
| D-2 | Estratégia de refactor (5 arquivos)? | **Híbrido (C)** — por ramo de seguro para branch-fields, por seção lógica para os outros 3 |

**Ordem de execução:**

1. **Security audit** → investigação, pode produzir 0 ou N fixes
2. **Idempotência dos GETs** → investigação, pode produzir 0 ou N fixes
3. **Docs — FilterTabs vs Select** → docs-only PR
4. **Refactor — 5 arquivos `features/proposals/`** → refactor PR

Itens 1 e 2 são **investigações**: o deliverable principal é um relatório markdown. Fixes encontrados viram PRs separados fora desta sequência.

---

## 3. PR 1 — Security audit

### 3.1 Branch e escopo

**Branch:** `audit/security-p2` (sem "feat/" ou "fix/" porque é investigação, não muda código de produção salvo se encontrar P0)

**Objetivo:** descobrir se há PII/tokens vazando no client-side e se os headers de segurança em produção estão configurados corretamente.

### 3.2 Método

**3.2.1 localStorage audit (client-side PII)**

- Via Playwright MCP, logar em `https://app.bensseg.com` com credenciais de teste
- Inspecionar `localStorage` e `sessionStorage` via `browser_evaluate`:
  ```js
  ;() => ({
    localStorage: Object.entries(localStorage),
    sessionStorage: Object.entries(sessionStorage),
  })
  ```
- Classificar cada entrada:
  - **P0 (bloqueio)**: CPF/CNPJ, senha hash, token JWT cru, email do usuário, telefone, endereço
  - **P1**: IDs internos de organização, IDs de usuário, UI state que revele hierarquia interna
  - **P2**: preferences da UI (tema, idioma, coluna visibility)
  - **OK**: nenhum dado sensível

**3.2.2 HTTP headers em prod**

- Rodar `curl -sI https://api.bensseg.com/api/v1/clients` e `curl -sI https://app.bensseg.com`
- Verificar presença e valor de:
  - `Strict-Transport-Security` (expect `max-age=31536000; includeSubDomains`)
  - `X-Frame-Options` (expect `DENY` ou `SAMEORIGIN`)
  - `X-Content-Type-Options` (expect `nosniff`)
  - `Content-Security-Policy` (expect any non-empty value — details to analyze)
  - `Referrer-Policy` (expect `no-referrer-when-downgrade` ou mais restritivo)
  - `Permissions-Policy` (expect any restrictive value)
- Comparar contra `@fastify/helmet` default preset e OWASP Secure Headers Project

### 3.3 Deliverable

**Sempre:**

- Arquivo `audit/security-p2-2026-04-11.md` com estrutura:

  ```markdown
  ## Security P2 Audit — 2026-04-11

  ### localStorage / sessionStorage findings

  | key | severity | description | fix |
  | --- | -------- | ----------- | --- |
  | ... | ...      | ...         | ... |

  ### HTTP headers findings

  | header | present? | value | severity |
  | ------ | -------- | ----- | -------- |
  | ...    | ...      | ...   | ...      |

  ### Summary

  - P0 count: N
  - P1 count: N
  - P2 count: N
  - Assessment: ALL_GOOD | FIXES_NEEDED
  ```

- Commit: `docs(audit): P2 security audit report`

**Condicional (se P0 encontrado):** STOP, reportar ao user, criar ticket para PR dedicado. Não tentar fix no mesmo PR.

### 3.4 Escopo fora

- Pen-test ativo (SQL injection, XSS, CSRF) — não é escopo desta auditoria
- `pnpm audit` de dependências — já roda no CI, fora de escopo
- Auditoria de permissões do VPS / SSH keys — fora de escopo
- Auditoria de RLS do PostgreSQL — fora de escopo
- Auditoria de secrets no repo (gitleaks) — fora de escopo

### 3.5 Critérios de aceitação

- [ ] `audit/security-p2-2026-04-11.md` existe e está commitado
- [ ] Todos os 6 headers HTTP listados acima foram verificados em prod
- [ ] `localStorage` e `sessionStorage` inspecionados em uma sessão logada real
- [ ] Classificação P0/P1/P2 documentada
- [ ] Se houver P0, user notificado antes de qualquer ação corretiva

---

## 4. PR 2 — Idempotência dos GETs

### 4.1 Branch e escopo

**Branch:** `audit/idempotency-p2`

**Objetivo:** confirmar que toda rota `GET /api/v1/*` é livre de side-effects observáveis no estado de negócio. Motivação: React Strict Mode dispara `useEffect` 2× em dev. Se algum GET incrementa contadores ou muda state no servidor, isso pode mascarar bugs e inflar métricas.

### 4.2 Método

**4.2.1 Listar todas as rotas GET**

```bash
grep -rn "method: 'GET'" apps/server/src/routes/v1/ | head
```

E também arquivos usando atalhos tipo `app.get(...)`:

```bash
grep -rn "app\\.get(\\|\\.route({\\s*method: 'GET'" apps/server/src/routes/v1/
```

**4.2.2 Classificar cada handler**

Para cada rota encontrada, ler o handler e classificar:

- **pure-read** — só chama `repository.findX` ou similar. Ideal. ✓
- **read + audit-log** — escreve um audit log mas não muda estado de negócio. Aceitável (audit logs são apenas-append). ✓
- **read + metrics/counter** — incrementa contador, view-count, last-seen. **Atenção:** pode inflar dados com Strict Mode.
- **read + write** — atualiza registros, marca como "visto", etc. **Bug potencial**.

**4.2.3 Foco especial**

Rotas suspeitas pelo nome:

- `GET /notifications/unread-count`, `GET /notifications/alert-counts`
- `GET /terms/status` (pode marcar termo como "viewed")
- `GET /proposals/:id`, `GET /clients/:id` (pode marcar "last accessed")
- Qualquer rota em `/stats/`, `/analytics/`, `/dashboard/`

### 4.3 Deliverable

**Sempre:**

Arquivo `audit/idempotency-p2-2026-04-11.md`:

```markdown
## Idempotency P2 Audit — 2026-04-11

### GET routes inventory

| route                                  | handler file    | classification | notes |
| -------------------------------------- | --------------- | -------------- | ----- |
| GET /api/v1/clients                    | list-clients.ts | pure-read      | ok    |
| GET /api/v1/notifications/unread-count | ...             | ...            | ...   |

### Findings

**Pure-read routes:** N
**Read + audit-log routes:** N
**Read + metrics routes:** N (list if any)
**Read + write routes:** N (list if any)

### Non-idempotent routes detected

- [route:handler-file] description + severity + recommendation

### Assessment

ALL_IDEMPOTENT | NON_IDEMPOTENT_FOUND
```

Commit: `docs(audit): P2 idempotency audit report`

**Condicional (se non-idempotent P0 encontrado):** STOP, reportar ao user, criar PR dedicado para fix.

### 4.4 Escopo fora

- Mutations (POST/PUT/PATCH/DELETE) — essas não são GETs
- `apps/chat-server` routes — fora de escopo desta passagem
- Internal routes (`routes/internal/`) — fora de escopo
- Better Auth routes (`/api/auth/*`) — fora de escopo (controlado por lib externa)

### 4.5 Critérios de aceitação

- [ ] `audit/idempotency-p2-2026-04-11.md` existe e está commitado
- [ ] Todas as rotas GET em `apps/server/src/routes/v1/` estão listadas e classificadas
- [ ] Assessment explícito: ALL_IDEMPOTENT ou NON_IDEMPOTENT_FOUND
- [ ] Se NON_IDEMPOTENT encontrado, user notificado

---

## 5. PR 3 — Documentação: FilterTabs vs Select

### 5.1 Branch e escopo

**Branch:** `docs/filter-tabs-convention`

**Objetivo:** formalizar a convenção de uso de `FilterTabs` vs `<Select>` nos módulos de listagem, fechando o item QA-P2-1 do relatório.

### 5.2 Arquivo modificado

`docs/UI-PATTERNS.md` — adicionar nova seção **"Filtros de listagem — FilterTabs vs Select"**.

### 5.3 Conteúdo da nova seção

**Regra geral:**
`FilterTabs` renderiza **apenas a dimensão primária** do módulo, com até 4 opções. Demais filtros (incluindo status secundário, período, prioridade) ficam em `<Select>` na `TableToolbar`.

**Critérios para escolher FilterTabs:**

- ≤ 4 opções (mais que 4 quebra o header em mobile)
- Dimensão primária — a que o usuário filtra com mais frequência
- Opção "Todos" é o default
- Valores são categóricos, não faixas contínuas

**Critérios para escolher `<Select>`:**

- > 4 opções
- Dimensão secundária (o módulo já tem FilterTabs para primária)
- Filtro raramente usado
- Valores são muitos (>20) → usar `<Autocomplete>` ou `<Combobox>` em vez de Select

**Matriz canônica por módulo:**

| Módulo      | FilterTabs primário          | Secundário (Select) |
| ----------- | ---------------------------- | ------------------- |
| clients     | tipo (Lead/Cliente/Ex)       | —                   |
| proposals   | tipo (Novo/Renovação)        | estágio             |
| policies    | status (Ativa/Canc/Exp)      | —                   |
| commissions | período (Todas/30d/90d)      | status              |
| claims      | prioridade (Normal/Alta/Urg) | status              |
| assistances | tipo (Guincho/Mec/Chav)      | status              |
| insurers    | status (Ativas/Inativas)     | —                   |
| audit       | período (Todas/30d/7d/Hj)    | entidade, ação      |

**ASCII diagram:**

```
┌──────────────────────────────────────────────────────┐
│ <ListPageHeader>                                     │
│  Breadcrumb › Page                                   │
│  h1 + description          [Primary CTA]             │
├──────────────────────────────────────────────────────┤
│ <TableToolbar>                                       │
│  [FilterTabs: primário] [🔎 search] [Select: secundário] [Columns] [Export] │
├──────────────────────────────────────────────────────┤
│ <DataTable>                                          │
└──────────────────────────────────────────────────────┘
```

### 5.4 Escopo fora

- Refatorar módulos que não seguem a convenção — se algum violar, fica como backlog separado
- Adicionar novos módulos — esta seção é apenas retroativa
- Reescrever seções existentes de `docs/UI-PATTERNS.md`

### 5.5 Critérios de aceitação

- [ ] Nova seção adicionada em `docs/UI-PATTERNS.md`
- [ ] Matriz dos 8 módulos preenchida
- [ ] ASCII diagram incluído
- [ ] 1 commit, 1 arquivo modificado
- [ ] `pnpm lint` continua verde (markdown também passa pelo prettier)

---

## 6. PR 4 — Refactor dos 5 arquivos > 200L em `features/proposals/`

### 6.1 Branch e escopo

**Branch:** `refactor/proposals-component-split`

**Objetivo:** decompor os 5 componentes que violam o limite de 200 linhas do `CLAUDE.md`. Estratégia híbrida (C): por ramo de seguro para os branch-fields; por seção lógica para os outros 3.

### 6.2 Arquivos alvo

| Arquivo                          | Linhas hoje | Decomposição                                                        |
| -------------------------------- | ----------- | ------------------------------------------------------------------- |
| `branch-field-sets.tsx`          | 293         | por ramo (auto, property, life, health, other)                      |
| `branch-field-sets-property.tsx` | 408         | por sub-tipo property (residential, commercial, condo)              |
| `proposal-detail.tsx`            | 360         | por seção lógica (header, financial, coverage, checklist, timeline) |
| `proposal-kanban.tsx`            | 309         | column/card/toolbar extraídos                                       |
| `issue-policy-dialog.tsx`        | 297         | steps extraídos (confirm, insurer, number, dates)                   |

### 6.3 Layouts novos

**`branch-field-sets.tsx`** (293L → orchestrator ~80L + fieldsets por ramo):

```
features/proposals/components/branch-fields/
├─ index.ts                    — re-export (barrel for consumers)
├─ branch-field-sets.tsx       — orchestrator (switch branch → render fieldset)
├─ types.ts                    — shared props
└─ fieldsets/
   ├─ auto.tsx
   ├─ property.tsx             — thin, delegates to property orchestrator (#2)
   ├─ life.tsx
   ├─ health.tsx
   └─ other.tsx                — fallback
```

**`branch-field-sets-property.tsx`** (408L → orchestrator + sub-type files):

```
features/proposals/components/branch-fields/fieldsets/property/
├─ index.tsx                   — orchestrator (switch property-subtype)
├─ residential.tsx
├─ commercial.tsx
├─ condominium.tsx
└─ shared.tsx                  — address, CEP, shared fields
```

**`proposal-detail.tsx`** (360L → orchestrator + sections):

```
features/proposals/components/proposal-detail/
├─ index.tsx                   — orchestrator (renders sections in order)
└─ sections/
   ├─ header-section.tsx
   ├─ financial-section.tsx
   ├─ coverage-section.tsx
   ├─ checklist-section.tsx
   └─ timeline-section.tsx
```

**`proposal-kanban.tsx`** (309L → orchestrator + parts):

```
features/proposals/components/proposal-kanban/
├─ index.tsx                   — orchestrator (board + DnD context)
├─ kanban-column.tsx
├─ kanban-card.tsx
└─ kanban-toolbar.tsx
```

**`issue-policy-dialog.tsx`** (297L → orchestrator + steps):

```
features/proposals/components/issue-policy-dialog/
├─ index.tsx                   — orchestrator (dialog shell + step controller)
└─ steps/
   ├─ confirm-step.tsx
   ├─ insurer-step.tsx
   ├─ policy-number-step.tsx
   └─ dates-step.tsx
```

**Nota:** os nomes exatos dos sub-componentes dependem do conteúdo real dos arquivos. O implementer deve inspecionar os arquivos e ajustar nomes baseados nas seções lógicas reais que encontrar. Os nomes acima são plausíveis mas podem mudar sem quebrar o design.

### 6.4 Regras gerais

- **Zero-regression**: comportamento idêntico, UX idêntico. Nenhuma mudança visual, nenhuma prop nova.
- **Orchestrator ≤ 150 linhas**
- **Sub-componentes ≤ 200 linhas**
- **Imports externos não mudam** — todos os arquivos novos são re-exportados via `index.ts` no caminho original.
  - Exemplo: consumers de `proposal-detail.tsx` continuam fazendo `import { ProposalDetail } from '@/features/proposals/components/proposal-detail'` e o `index.tsx` da pasta nova re-exporta.
- **Shared types** em `types.ts` dentro da pasta nova.
- **Strings pt-BR** preservadas literalmente.
- **Zero `any`**, zero `console.log`, zero `as` assertions fora de test mocks.
- **Zero testes unitários novos** — não há cobertura unitária hoje nesses arquivos; QA Playwright cobre regressão funcional.

### 6.5 Ordem de execução

1. **`issue-policy-dialog`** — flow isolado (dialog), menor risco
2. **`proposal-kanban`** — view-específica, não afeta listing principal
3. **`proposal-detail`** — página inteira, risco médio (rota `/proposals/[id]`)
4. **`branch-field-sets` + `branch-field-sets-property` JUNTOS** — 701L somados, interdependentes; precisam ser refatorados no mesmo commit/par-de-commits

Commits: 1 por arquivo original decomposto + 1 opcional "adjust imports if needed" → 5 commits.

### 6.6 Validação

- `pnpm lint && pnpm typecheck && pnpm build && pnpm test` após **cada commit**
- Playwright QA manual ao final, cobrindo:
  - Criar nova proposta (exercita branch-field-sets + branch-field-sets-property)
  - Ver proposta na listagem (exercita proposals-content, não afetado)
  - Trocar view para Kanban e arrastar card (exercita proposal-kanban)
  - Abrir detalhe da proposta (exercita proposal-detail)
  - Emitir apólice a partir da proposta (exercita issue-policy-dialog)
- Screenshots before/after em `audit/qa-report/after-p2-refactor/`

### 6.7 Critérios de aceitação

- [ ] Os 5 arquivos originais ou foram removidos ou viraram re-export finos (≤ 10 linhas)
- [ ] Todos os orchestrators ≤ 150 linhas
- [ ] Todos os sub-componentes ≤ 200 linhas
- [ ] Zero mudança em imports externos
- [ ] Zero regressão visual/funcional nos 5 fluxos do Playwright QA
- [ ] 5 quality gates verdes
- [ ] Screenshots before/after commitados

### 6.8 Riscos e mitigações

| Risco                                                 | Impacto | Mitigação                                                                              |
| ----------------------------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| Prop drilling excessivo após split                    | Médio   | Shared types + `useFormContext` do RHF para escapar manual                             |
| Re-exports confundem o implementer                    | Baixo   | Pattern idêntico ao shadcn/ui — já existe na codebase                                  |
| Branch-fields logic não é tão separável quanto parece | Alto    | Se o implementer descobrir isso no código, reportar como NEEDS_CONTEXT e re-brainstorm |
| Cursor de edição do form perde foco entre sub-comps   | Médio   | `FormField` do RHF é estável entre re-renders — não deve acontecer, mas validar no QA  |

---

## 7. Ordem geral de merge e rollout

```
main
  └─> audit/security-p2              (PR 1, investigação)
         │
         └─ merge (baixo risco, docs only)
              │
              └─> audit/idempotency-p2     (PR 2, investigação)
                     │
                     └─ merge (baixo risco, docs only)
                          │
                          └─> docs/filter-tabs-convention (PR 3, docs only)
                                 │
                                 └─ merge
                                      │
                                      └─> refactor/proposals-component-split (PR 4, refactor)
                                             │
                                             └─ merge (QA rigoroso antes)
```

Cada PR rebaseia sobre o anterior. Não há dependências entre PRs; a ordem é puramente de conveniência de revisão (leves primeiro, pesado último).

---

## 8. Fora de escopo deste design

- Refactor de outros arquivos > 200L fora de `features/proposals/` (ex: `accept-invitation/content.tsx` 470L, `channels-page.tsx` 346L, `document-list.tsx` 285L) — backlog futuro.
- Shadcn primitives (`components/ui/sidebar.tsx` 739L, `drawer.tsx` 626L, etc.) — intencionalmente grandes, não tocar.
- Refactor do backend (`apps/server` ou `packages/core`) — não faz parte deste design.
- Alteração da convenção atual de FilterTabs — PR 3 apenas documenta, não muda código.
- Decisão de produto sobre "Exportar CSV" em 3 módulos (QA-P1-5) — ticket separado.

---

## 9. Referências

- QA report original: `audit/qa-report/REPORT.md`
- PR #82 (consistência): `b4e24c2 refactor(web): unify dashboard list pages with ListPageHeader`
- PR #83 (sort): `a8d0ab9 fix(web,server): server-side sort for proposals and insurers`
- Specs anteriores:
  - `docs/superpowers/specs/2026-04-09-shared-table-primitives-design.md`
  - `docs/superpowers/specs/2026-04-11-dashboard-consistency-and-sort-fix-design.md`
- CLAUDE.md §Object Calisthenics (limite de 200 linhas por componente)
- `@coss/style` design tokens e shadcn/ui primitives (pastes de referência)
