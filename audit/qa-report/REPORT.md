# Relatório QA + Code Review — Módulos Dashboard

**Data:** 2026-04-11
**Escopo:** apps/web — dashboard (clients, proposals, policies, commissions, claims, endorsements, assistances, insurers, audit, chat)
**Método:** Playwright MCP (desktop 1440×900 + mobile 375×812) + code review estático em paralelo
**Credencial:** `test@user.com` / OWNER

---

## Resumo executivo

- **Higiene de código excelente:** zero `any`, zero `console.log`, zero `eslint-disable`, zero HTML injetado inseguro.
- **Segurança de PII forte:** a API `/api/v1/clients` retorna CPF/CNPJ **já mascarados** (`**.***.***/0001-99`) — defesa no servidor, não só no front.
- **Console sem erros** em todas as páginas auditadas; apenas `ERR_ABORTED` de double-fetch do React Strict Mode (dev-only, não impacta prod).
- **Layout base consistente:** sidebar + banner + PageHeader + (FilterTabs | Select) + Table/Kanban + CursorPagination em 8/10 módulos.
- **Principais desvios:** 2 módulos sem breadcrumb, 2 tabelas com sorting client-side (bug funcional), 2 páginas sem `metadata`, 5 inconsistências menores de UI.

---

## 1. Matriz de consistência entre módulos

Comparação dos elementos padronizados esperados na listagem:

| Módulo       | Title | Breadcr. | Search                            | Filtro principal             | 2º filtro      | CTA criar        | Colunas | Exportar CSV | Importar | Sort server |
| ------------ | ----- | -------- | --------------------------------- | ---------------------------- | -------------- | ---------------- | ------- | ------------ | -------- | ----------- |
| clients      | ok    | ok       | "Buscar clientes..."              | Tabs: Todos/Lead/Cliente/Ex  | —              | Novo Cliente     | ok      | ok           | ok       | ok          |
| proposals    | ok    | ok       | "Buscar propostas..."             | Tabs: Todos/Novo/Renovação   | Select estágio | Nova proposta    | ok      | ok           | —        | ❌ client   |
| policies     | ok    | ok       | "Buscar por número ou cliente..." | Tabs: Todos/Ativa/Canc/Exp   | —              | — (by design)    | ok      | ok           | —        | ?           |
| commissions  | ok    | ok       | "Buscar comissões..."             | Tabs: período (Todas/30/90d) | Select status  | — (by design)    | ok      | ok           | —        | ok          |
| claims       | ok    | ok       | "Buscar sinistros..."             | Tabs: prioridade             | Select status  | Novo Sinistro    | ok      | —            | —        | ok          |
| assistances  | ok    | ok       | "Buscar assistências..."          | Tabs: tipo                   | Select status  | Nova Assistência | ok      | —            | —        | ok          |
| insurers     | ok    | ok       | "Buscar por nome ou código..."    | Tabs: Todas/Ativas/Inativas  | —              | Nova seguradora  | ok      | —            | —        | ❌ client   |
| endorsements | ❌    | ❌       | "Buscar por apólice ou segurado…" | —                            | —              | —                | —       | —            | —        | N/A Kanban  |
| audit        | ok    | ❌       | — (sem busca)                     | Tabs: período                | 2 Selects      | — (by design)    | ok      | —            | —        | —           |
| chat         | ❌    | —        | "Buscar conversa..."              | Tabs: canais                 | —              | — (by design)    | —       | —            | —        | —           |

**Observação:** "Title" = `<title>` do documento (SEO/metadata). "Breadcr." = `<PageBreadcrumb>`.

---

## 2. Achados QA (Playwright)

### P0 — Bloqueia merge

**QA-P0-1. Sorting client-side em `proposals` e `insurers`** (bug funcional)
As duas tabelas usam `getSortedRowModel()` sem `manualSorting: true`. Como a paginação é cursor-based server-side, ao clicar numa coluna o usuário ordena **apenas os 10-20 registros da página atual**, não o conjunto total. Dá impressão de estar ordenado e esconde registros fora da página.

- `apps/web/src/features/proposals/components/proposals-table.tsx:6,109`
- `apps/web/src/features/insurers/components/insurers-table.tsx:6,108`
- **Fix:** adicionar `manualSorting: true` + `manualPagination: true` + `manualFiltering: true` no `useReactTable`, remover `getSortedRowModel`, propagar `sortBy`/`sortOrder` via `useProposals`/`useInsurers`. Backend de proposals/insurers precisa aceitar esses params (alguns já aceitam — verificar).

**QA-P0-2. `endorsements/page.tsx` é `'use client'`** (SEO / arquitetura)
Page component tem `'use client'` no topo → não pode exportar `metadata` → `<title>` da página fica "Bens Seguros" genérico, quebrando a convenção e prejudicando SEO/histórico do browser.

- `apps/web/src/app/(dashboard)/endorsements/page.tsx:1`
- **Fix:** extrair o toggle dinâmico para `EndorsementsContent.tsx` client-side, deixar `page.tsx` como RSC com `export const metadata = { title: 'Endossos | Bens Seguros' }`.

**QA-P0-3. `chat/page.tsx` sem `metadata`**
`<title>` da página de Chat também é "Bens Seguros" genérico. Mesmo padrão do endorsements (provavelmente mesma causa — `'use client'` no page).

- `apps/web/src/app/(dashboard)/chat/page.tsx`
- **Fix:** mesmo da QA-P0-2.

### P1 — Corrigir em seguida

**QA-P1-1. `audit/page.tsx` sem `<PageBreadcrumb>`**
Único módulo de listagem (além de endorsements) sem breadcrumb. Quebra padrão de navegação contextual.

- `apps/web/src/app/(dashboard)/audit/page.tsx:8`
- **Fix:** adicionar `<PageBreadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Auditoria' }]} />` antes do `<h1>`.

**QA-P1-2. `endorsements` sem `<PageBreadcrumb>`** (consequência de ser client page)

- **Fix:** junto com QA-P0-2.

**QA-P1-3. Casing dos CTAs inconsistente**

- Title Case: "Novo Cliente", "Novo Sinistro", "Nova Assistência"
- Sentence case: "Nova proposta" (`proposals-table.tsx`), "Nova seguradora" (`insurers-table.tsx`)
- **Fix:** padronizar para Title Case (mais enfático no CTA primário).

**QA-P1-4. Ícone `Plus` ausente em 2 CTAs**
Botão "Novo Sinistro" e "Nova Assistência" exibem apenas texto; "Novo Cliente"/"Nova seguradora"/"Nova proposta" exibem `<Plus>` + texto.

- `apps/web/src/features/claims/components/claims-table.tsx:175`
- `apps/web/src/features/assistances/components/assistances-table.tsx:148`
- **Fix:** adicionar `<Plus className="size-4" />` antes do label.

**QA-P1-5. "Exportar CSV" ausente em 3 módulos** (claims, assistances, insurers)
Os outros 5 módulos de listagem têm o botão. Decisão de produto: aplicar em todos ou remover dos que têm.

**QA-P1-6. Clients: CTA fora do `TableToolbar`**
Único módulo que coloca o botão no header da página em vez de dentro da toolbar. Em mobile causa quebra de linha visível.

- `apps/web/src/app/(dashboard)/clients/page.tsx:29`
- **Fix:** mover o botão para dentro do `<TableToolbar>` como filho (padrão já usado nos demais módulos).

### P2 — Melhorias

**QA-P2-1. FilterTabs semanticamente divergentes**

- clients: tipo (Lead/Cliente/Ex)
- proposals: tipo de proposta (Novo/Renovação) + Select estágio
- policies: status (Ativa/Cancelada/Expirada)
- commissions: **período** (Todas/30d/90d) + Select status
- claims: **prioridade** (Normal/Alta/Urgente) + Select status
- assistances: **tipo** (Guincho/Mecânica/Chaveiro) + Select status
- insurers: status (Ativas/Inativas)
- audit: período (Todas/30d/7d/Hoje) + 2 Selects

Não há bug, mas a regra "tabs = filtro primário, select = filtro secundário" não é óbvia. Sugerir documentar a convenção em `docs/UI-PATTERNS.md` e, no mínimo, colocar o **status** sempre no mesmo lugar (tabs ou select) entre módulos semelhantes.

**QA-P2-2. Cabeçalhos de tabela sem botão-sort em alguns módulos**

- `clients`: 4/5 headers têm botão ordenação, 1 não (Telefone) — OK (campo não indexado).
- `commissions`, `claims`, `assistances`: headers são texto puro, sem indicador visual de que **não** são ordenáveis.
- **Fix:** quando uma coluna não é ordenável, ela deve ser visualmente idêntica entre módulos (hoje é o caso, só precisa confirmar que a decisão é consistente).

---

## 3. Segurança — Análise de requests e storage

Evidências coletadas do browser via Playwright:

| Item                                       | Resultado                                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| CPF/CNPJ em respostas da API               | ok — **Mascarados no server** (`**.***.***/0001-99`)                                                                         |
| `organizationId` em respostas              | ok — Não retornado no objeto de cliente                                                                                      |
| Password/hash em `/api/auth/get-session`   | ok — Ausente                                                                                                                 |
| Token interno/secret no user               | ok — Ausente                                                                                                                 |
| `session.token` em `/api/auth/get-session` | ⚠️ Presente — padrão Better Auth, aceitável se via cookies httpOnly; verificar se frontend não está gravando em localStorage |
| `localStorage` de dados sensíveis          | A verificar (executar auditoria de `localStorage`)                                                                           |
| Logs de console com dados                  | ok — 0 erros, 0 warnings                                                                                                     |
| IDs internos sequenciais expostos          | ok — IDs são CUIDs (`seed_user_002`, `POL-2024205`…)                                                                         |
| CORS/cookies httpOnly                      | A validar em produção                                                                                                        |

**Observação 1:** a máscara de CPF/CNPJ no JSON é feita no servidor — isso é a decisão certa e elimina risco de vazamento por componente React que acidentalmente loga o objeto. Mantenha.

**Observação 2:** há um padrão de double-fetch aparecendo no log (`ERR_ABORTED` seguido de `200 OK`). Causa: React Strict Mode em dev. **Não é bug de prod**, mas: se algum desses requests GET tiver side-effect (ex: incrementar contador), vira bug. Confirmar que todos os GETs são idempotentes.

**Observação 3:** não há CSP nem X-Frame-Options observados nos headers em dev — verificar Helmet no `apps/server` antes de ir pra prod.

---

## 4. Performance — Observações React/Next

- **Waterfalls:** os módulos parecem disparar múltiplos fetches em paralelo (`/clients`, `/notifications/alert-counts`, `/notifications/unread-count`, `/terms/status`) — parece bom, sem sequência serial.
- **StrictMode double-invocation:** ok em dev, nenhuma ação.
- **Sort client-side em `proposals` e `insurers`:** além do bug funcional (QA-P0-1), é também waste de CPU/memória no client. Resolver servidor-side corrige ambos.
- **`getSortedRowModel` + `getFilteredRowModel` importados mas sem `manualPagination`:** TanStack Table acaba percorrendo a lista cliente a cada keystroke. Para datasets grandes, isso será custo real — corrigir como parte do P0-1.
- **Arquivos > 200 linhas (CLAUDE.md limite):** `proposal-detail.tsx` (360L), `branch-field-sets-property.tsx` (408L), `proposal-kanban.tsx` (309L), `branch-field-sets.tsx` (293L), `issue-policy-dialog.tsx` (297L). Extrair sub-componentes. Re-render de qualquer parte do formulário hoje força re-mount de tudo.

---

## 5. UX / Responsivo

**Mobile 375px** — 2 módulos testados:

- **clients**: ok — transforma tabela em cards, cabeçalho quebra de forma limpa, "Novo Cliente" permanece visível.
- **proposals**: ok — cards OK, "Tabela | Kanban" toggle fica no topo, filtros empilhados. Notei que "Colunas" + "Importar" + "CTA" ficam em 3 linhas no mobile — aceitável.

**Dark mode / acessibilidade:** não auditado nesta passagem (fora do escopo imediato).

---

## 6. Checklist consolidado (ordem de correção sugerida)

### Bloqueios (fazer agora — impacto funcional/SEO)

- [ ] **QA-P0-1** `proposals-table.tsx` — sort server-side + `manualSorting: true` + `manualPagination: true`
- [ ] **QA-P0-1** `insurers-table.tsx` — idem
- [ ] **QA-P0-2** `endorsements/page.tsx` — extrair content, remover `'use client'`, exportar `metadata`
- [ ] **QA-P0-3** `chat/page.tsx` — mesmo padrão

### Consistência (próxima sprint)

- [ ] **QA-P1-1** `audit/page.tsx` — adicionar `<PageBreadcrumb>`
- [ ] **QA-P1-3** Padronizar CTAs para Title Case: "Nova Proposta", "Nova Seguradora"
- [ ] **QA-P1-4** Adicionar `<Plus />` em claims-table + assistances-table
- [ ] **QA-P1-5** Decidir: Exportar CSV em claims/assistances/insurers OU remover dos 5 módulos que têm
- [ ] **QA-P1-6** `clients/page.tsx` — mover CTA para dentro de `TableToolbar`

### Refatoração e performance (backlog)

- [ ] `proposal-detail.tsx` (360L) — extrair sub-componentes
- [ ] `branch-field-sets-property.tsx` (408L) — idem
- [ ] `proposal-kanban.tsx` (309L) — idem
- [ ] `branch-field-sets.tsx` (293L) — idem
- [ ] `issue-policy-dialog.tsx` (297L) — idem
- [ ] Auditar `localStorage` por vazamento de PII
- [ ] Documentar convenção FilterTabs vs Select em `docs/UI-PATTERNS.md`
- [ ] Confirmar idempotência dos GETs (Strict Mode double-fetch)
- [ ] Validar Helmet + CSP em produção

---

## Evidências

- Screenshots: `audit/qa-report/screenshots/01-clients-desktop.png` … `12-proposals-mobile.png`
- Network log: `audit/qa-report/logs/network-requests.log`
- Console log: `audit/qa-report/logs/console-messages.log`

## Métricas agregadas

| Métrica                                            | Valor                   |
| -------------------------------------------------- | ----------------------- |
| Módulos auditados                                  | 10                      |
| Erros console críticos                             | 0                       |
| Usos de `any`                                      | 0                       |
| Usos de `console.log`                              | 0                       |
| Usos de `eslint-disable`                           | 0                       |
| Usos de HTML injetado inseguro                     | 0                       |
| Páginas sem `metadata` (`<title>` genérico)        | 2                       |
| Páginas sem breadcrumb                             | 2                       |
| Tabelas com client-side sort sobre dados paginados | 2                       |
| Arquivos acima de 200 linhas                       | 5                       |
| PII (CPF/CNPJ) vazando no client                   | 0 (mascarado no server) |
