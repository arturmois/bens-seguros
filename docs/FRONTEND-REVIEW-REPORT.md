# Frontend Code Review Report

**Data:** 2026-03-26
**Reviewer:** Claude Opus 4.6 (automated)
**Escopo:** `apps/web/` - Frontend Next.js 16 + React 19
**Skills aplicadas:** ui-ux-pro-max, frontend-design, vercel-react-best-practices, web-design-guidelines

---

## Resumo Executivo

O frontend do Bens Seguros e uma aplicacao bem estruturada com 18 feature modules, 54 componentes UI (shadcn/ui), 50+ hooks customizados e 23 rotas. A arquitetura feature-based esta consistente, o uso de React Query e exemplar, e as regras de tipagem sao seguidas com rigor (zero `any`, zero `console.log`, zero `eslint-disable`).

Porem, existem gaps criticos em error boundaries, duplicacao de codigo, inconsistencias no design system, e problemas de acessibilidade concentrados no modulo de chat.

### Scorecard

| Dimensao                      | Nota | Comentario                                                                    |
| ----------------------------- | ---- | ----------------------------------------------------------------------------- |
| Estrutura e Arquitetura       | 8/10 | Feature-based consistente, poucos gaps                                        |
| Tipagem e Qualidade de Codigo | 9/10 | Zero `any`, zero `console.log`, Zod em todos os forms exceto 1                |
| Design System e UI            | 6/10 | Inconsistencias entre badges, empty states, cores hardcoded                   |
| Performance                   | 8/10 | React Query bem configurado, charts lazy-loaded, cursor pagination            |
| Seguranca                     | 7/10 | Cookie-based auth, sem XSS, mas sem error boundaries e route protection fraca |
| Acessibilidade                | 5/10 | Chat module com varios problemas, charts sem ARIA                             |
| Escalabilidade                | 7/10 | Boa base mas duplicacao significativa de componentes                          |

---

## Pontos Positivos

### Arquitetura

- Feature-based organization com `components/`, `hooks/`, `lib/`, `types/` por modulo
- Server Components por padrao nas pages, `"use client"` apenas onde necessario
- Separacao limpa entre data fetching (hooks) e apresentacao (components)
- Provedores bem organizados: ThemeProvider, QueryClientProvider, TooltipProvider

### Tipagem

- **Zero `any`** em todo o codebase
- **Zero `@ts-ignore`** ou `@ts-expect-error`
- **Zero `console.log`** (Pino logger no backend)
- **Zero `// eslint-disable`**
- Todos os 15 formularios usam `zodResolver` (exceto 1 - branch-fields.tsx)
- Named exports explicitos, sem barrel `export *`
- Naming conventions 100% consistentes (kebab-case files, PascalCase components)

### Performance

- `staleTime: 60_000` global no React Query
- Todos os 5 charts do dashboard usam `next/dynamic` com `ssr: false`
- Zero `useEffect` para data fetching - tudo via React Query
- Zero `<img>` tags - todo uso correto de Next.js Image ou CSS
- Paginacao cursor-based em 100% dos listings (zero offset)
- PDF e CSV gerados server-side via API (sem bibliotecas pesadas no frontend)
- Nenhum componente definido dentro de outro componente

### Seguranca

- Auth cookie-based com `credentials: 'include'` (sem tokens em localStorage)
- Zero uso de innerHTML ou injeccao de HTML raw
- Zero localStorage para dados sensiveis
- Multi-tenancy: `organizationId` extraido da sessao no backend, nao enviado pelo frontend
- `queryClient.invalidateQueries()` ao trocar organizacao (previne data leak)
- Chat text renderizado via React JSX expression, nao HTML raw

### UX

- Todos os 7 listings implementam os 4 estados UI (Empty, Loading, Error, Success)
- Kanban cards com `role="button"`, `tabIndex={0}`, keyboard handlers
- Chat com layout responsivo mobile/desktop com animacoes de transicao
- Command palette (Cmd+K) para busca global
- Notification bell com contagem de nao-lidos
- Org switcher funcional com avatar gerado
- `prefers-reduced-motion` respeitado no CSS global

---

## Problemas Encontrados

### CRITICO (P0) - Devem ser corrigidos

#### 1. Zero Error Boundaries em toda a aplicacao

**Impacto:** Qualquer erro de renderizacao React causa tela branca para o usuario
**Locais afetados:** Toda a aplicacao
**Detalhes:**

- Nenhum arquivo `error.tsx` em nenhum route segment
- Nenhum `global-error.tsx` no root
- Nenhum `loading.tsx` em nenhum route segment
- Nenhum `not-found.tsx` (404 customizado)

**Recomendacao:** Criar `global-error.tsx`, `error.tsx` no grupo `(dashboard)`, `loading.tsx` para rotas com data fetching, e `not-found.tsx` global.

---

#### 2. Font CSS variable nao conectada corretamente

**Impacto:** Potencial FOUT (Flash of Unstyled Text), otimizacao de font do Next.js nao funciona
**Local:** `apps/web/src/app/layout.tsx` + `apps/web/src/app/globals.css`
**Detalhes:**

- `layout.tsx` define `--font-inter` via `next/font/google`
- `globals.css` referencia `--font-sans: 'Inter', ...` com string literal hardcoded
- A variavel `--font-inter` do Next.js nunca e usada no CSS
- `--font-heading` e auto-referencial: `var(--font-heading, ui-sans-serif, ...)` - nunca recebe valor real

**Recomendacao:** Conectar `--font-sans: var(--font-inter)` no CSS. Definir `--font-heading` com font real ou remover.

---

#### 3. Breakpoint mismatch entre hooks

**Impacto:** Comportamento responsivo inconsistente
**Locais:**

- `apps/web/src/hooks/use-mobile.ts` - `MOBILE_BREAKPOINT = 768`
- `apps/web/src/hooks/use-media-query.ts` - `md: 800`

**Detalhes:** Os dois hooks discordam se 780px e mobile. `use-media-query.ts` usa `md: 800` que nao e padrao Tailwind (768px). Alem disso, `use-mobile.ts` usa `useState + useEffect` (risco de hydration flash) enquanto `use-media-query.ts` usa `useSyncExternalStore` (correto).

**Recomendacao:** Deletar `use-mobile.ts` (nao e importado em lugar nenhum). Corrigir breakpoint `md` para 768 em `use-media-query.ts`.

---

### ALTO (P1) - Devem ser priorizados

#### 4. Duplicacao severa de componentes de paginacao

**Impacto:** Manutencao multiplicada, risco de divergencia
**Locais:** 4 arquivos identicos:

- `features/commissions/components/commissions-pagination.tsx`
- `features/clients/components/clients-pagination.tsx`
- `features/claims/components/claims-pagination.tsx`
- `features/assistances/components/assistances-pagination.tsx`

**Detalhes:** Byte-for-byte identicos exceto nome do componente e `aria-label`. Um componente `<CursorPagination label="clientes" />` compartilhado substituiria os 4.

**Recomendacao:** Criar `components/shared/cursor-pagination.tsx` e refatorar.

---

#### 5. Duas patterns incompativeis de status badges

**Impacto:** Visual inconsistente entre features, manutencao duplicada
**Locais:**

- Claims/Assistances: usam `<span>` raw com Tailwind classes manuais
- Channels/Conversations: usam componente `<Badge>` do shadcn/ui com variants

**Detalhes:** Border-radius, padding, font-weight, hover behaviors sao diferentes entre os dois patterns. Claims/Assistances nao respondem a mudancas de tema.

**Recomendacao:** Migrar todos para usar `<Badge>` com variants semanticos, ou criar `<StatusBadge>` generico.

---

#### 6. Chat module - prop drilling de 3 niveis

**Impacto:** Viola regra "no prop drilling beyond 2 levels"
**Local:** `features/chat/`
**Detalhes:**

- `ChatLayout` passa ~22 props via `sharedLayoutProps`
- `DesktopChatLayout` recebe e repassa subsets para `ChatArea` (14 props) e `ConversationList` (8 props)
- `ChatArea` repassa para `ChatHeader` (7 props), `MessageInput` (3 props)

Props como `currentUserId`, `typingUser`, `onBack` viajam 3 niveis.

**Recomendacao:** Expandir `ChatActionsProvider` para incluir display state, ou criar um Zustand store scoped ao chat.

---

#### 7. Charts sem acessibilidade

**Impacto:** Screen readers nao conseguem acessar dados dos graficos
**Locais:**

- `features/dashboard/components/proposals-by-stage.tsx`
- `features/dashboard/components/commissions-summary.tsx`
- `features/dashboard/components/claims-by-priority.tsx`
- `features/dashboard/components/trend-chart.tsx`

**Detalhes:** Nenhum chart tem `aria-label`, `role="img"`, ou descricao textual.

**Recomendacao:** Adicionar `aria-label` descritivo e `role="img"` ao container de cada chart.

---

#### 8. Chat icon-only buttons sem `aria-label`

**Impacto:** Screen readers nao identificam funcao dos botoes
**Locais:**

- `features/chat/components/message-input.tsx:44` - botao Send
- `features/chat/components/chat-header.tsx:47` - botao Back
- `features/chat/components/contact-profile.tsx:40` - botao Close
- `features/chat/components/header-actions.tsx:73` - DropdownMenuTrigger
- `features/chat/components/message-bubble.tsx:52,60` - audio/video sem labels

**Recomendacao:** Adicionar `aria-label` a todos os botoes icon-only.

---

### MEDIO (P2) - Devem ser planejados

#### 9. Cores hardcoded em marketing e dashboard

**Impacto:** Nao adaptam a mudancas de tema, quebram em dark mode
**Locais:**

- 11 instancias de hex hardcoded em marketing (`#0a101f`, `#0f172a`, `#111827`, `#f8fafc`)
- Dashboard: `text-emerald-500`, `text-red-500` ao inves de `text-success`, `text-destructive`
- 35 ocorrencias de raw Tailwind color utilities em 16 feature files

**Recomendacao:** Substituir hex por tokens semanticos. Usar `text-success`/`text-destructive` no dashboard.

---

#### 10. Empty states inconsistentes entre features

**Impacto:** UX visual diferente dependendo da feature
**Detalhes:**

- `ai-agents`, `channels`, `members` usam o componente `Empty` do design system
- `clients`, `claims`, `commissions`, `assistances` usam `EmptyRow` inline (texto simples numa TableRow)
- `proposals` tem `ProposalsEmptyState` custom
- Dashboard nao tem empty state para tenant novo (mostra zeros)

**Recomendacao:** Padronizar todos os empty states usando o componente `Empty` do design system.

---

#### 11. Schemas Zod duplicados entre frontend e backend

**Impacto:** Mudancas de validacao precisam ser aplicadas em dois lugares
**Detalhes:** Todos os schemas em `features/*/lib/schemas.ts` sao frontend-only. O backend tem schemas separados em `apps/server/src/schemas/`. Nenhum e importado de um pacote compartilhado.

**Recomendacao:** Mover schemas compartilhaveis para `@repo/shared` e importar em ambos os lados.

---

#### 12. Modals/Sheets/Dialogs nunca sao lazy-loaded

**Impacto:** ~40 componentes de dialog/sheet incluidos no bundle mesmo quando nunca abertos
**Locais:** Todos os `*-dialog.tsx`, `*-sheet.tsx`, `*-modal.tsx`

**Recomendacao:** Usar `next/dynamic` para dialogs e sheets pesados (especialmente os que contem formularios complexos).

---

#### 13. `null as TData` type lie no API client

**Impacto:** Pode mascarar null reference errors em consumers
**Locais:**

- `apps/web/src/lib/api-client.ts:63`
- `apps/web/src/features/chat/lib/chat-api.ts:74`

**Detalhes:** Para respostas 204, `null` e assertado como `TData`. Se o consumer espera um objeto, tera runtime error nao detectado pelo TypeScript.

**Recomendacao:** Retornar `ApiResponse<TData | null>` ou usar discriminated union.

---

#### 14. `as` assertions sistematicas em hooks de listing

**Impacto:** 5 hooks compartilham o pattern `response.meta as XListMeta`
**Locais:** `use-clients.ts:32`, `use-assistances.ts:41`, `use-claims.ts:42`, `use-commissions.ts:45`, `use-endorsements.ts:35`

**Recomendacao:** Tornar `api.get` generico com type parameter para meta: `api.get<TData, TMeta>()`.

---

#### 15. Tooltip style duplicado em todos os charts

**Impacto:** DRY violation, manutencao em 4 lugares
**Locais:** `proposals-by-stage.tsx`, `commissions-summary.tsx`, `trend-chart.tsx`, `claims-by-priority.tsx`

**Recomendacao:** Extrair para constante `CHART_TOOLTIP_STYLE` em `features/dashboard/lib/constants.ts`.

---

#### 16. Cores dos charts mudam familia entre light/dark mode

**Impacto:** Charts parecem visualizacoes completamente diferentes ao trocar tema
**Local:** `apps/web/src/app/globals.css`
**Detalhes:** Light mode usa `orange-600, teal-600, cyan-900, amber-400`. Dark mode usa `blue-700, emerald-500, amber-500, purple-500`. Familias de cor totalmente diferentes.

**Recomendacao:** Usar variantes tonais da mesma paleta em ambos os modos.

---

#### 17. Dois form field patterns coexistem

**Impacto:** Visual inconsistente entre formularios
**Detalhes:**

- `ClaimForm`, `ClientForm`: usam `<FormField>` de `@/components/shared/form-field`
- `ProposalForm`: repete label+error inline manualmente

**Recomendacao:** Padronizar todos os forms para usar `<FormField>`.

---

#### 18. Chat JWT em variavel module-level

**Impacto:** Se houver XSS em qualquer parte, token pode ser exfiltrado
**Local:** `features/chat/lib/chat-api.ts:38`
**Detalhes:** `cachedToken` armazenado em memoria JS do modulo, enviado como `Authorization: Bearer`. Risco depende do TTL do token.

**Recomendacao:** Avaliar se o chat server pode usar cookie-based auth como o API principal.

---

#### 19. Middleware nao verifica roles nas rotas

**Impacto:** Um `VIEWER` pode navegar diretamente para `/settings` via URL
**Local:** `apps/web/src/proxy.ts`
**Detalhes:** Middleware verifica apenas autenticacao (sessao + org cookie), nao autorizacao. Sidebar esconde links, mas rotas sao acessiveis. Backend rejeita acoes nao autorizadas, mas a pagina carrega.

**Recomendacao:** Adicionar role-check no proxy/middleware para rotas admin-only como defense-in-depth.

---

### BAIXO (P3) - Nice to have

#### 20. `branch-fields.tsx` e o unico form sem Zod validation

**Local:** `features/proposals/components/branch-fields.tsx:147`
**Detalhes:** Usa `useForm<FieldValues>` sem `zodResolver`. Tipo generico `FieldValues`.

#### 21. Dead code

- `features/dashboard/components/policies-expiring.tsx` - componente existe mas nao e importado
- `hooks/use-mobile.ts` - nao importado, substituido por `use-media-query.ts`
- `features/chat/hooks/use-socket.ts` - `lastEventTimestampRef` escrito mas nunca lido

#### 22. Modulos `org` e `organization` separados

**Detalhes:** Dois feature modules para concerns relacionados. `org` lida com seletor/criacao, `organization` com settings. Confuso.

#### 23. API client sem AbortSignal, retry, ou timeout

**Local:** `apps/web/src/lib/api-client.ts`
**Detalhes:** TanStack Query passa signals de cancelamento que sao ignorados. Sem retry para falhas transientes.

#### 24. Inconsistencias menores de forma

- Sheet width: `ClientForm` usa `sm:max-w-lg`, `ProposalForm` usa `sm:max-w-[480px]`
- Form spacing: `ClientForm` usa `mt-6 space-y-4 px-6`, `ProposalForm` usa `space-y-4 px-6 pt-4`
- Query keys: alguns hooks usam string (`'clients'`), outros `as const` tuple (`['proposals'] as const`)

#### 25. CSS duplicado

**Local:** `globals.css:336-348` - regra `code, kbd, samp, pre { font-family }` duplicada

#### 26. Org cookie sem flag `secure`

**Local:** `apps/web/src/lib/org-cookie.ts:5`
**Detalhes:** Cookie `bens-active-org` nao tem `secure` flag. Contem apenas UUID, risco baixo.

#### 27. Socket cleanup incompleto

**Local:** `features/chat/hooks/use-socket.ts`
**Detalhes:** Listener `reconnect_attempt` em `sock.io` nunca e removido no cleanup. Memory leak menor em remount.

#### 28. Dependencias potencialmente redundantes

- `@radix-ui/react-slot` + `radix-ui` (v1.4.3 unificado pode ja incluir Slot)
- `@base-ui/react` + `radix-ui` servem propositos sobrepostos

#### 29. Chat inputs sem `<Label>`

**Locais:** `message-input.tsx:37`, `conversation-list.tsx:138` - apenas placeholder, sem label semantico.

#### 30. Table `<th>` sem `scope="col"`

**Local:** `components/ui/table.tsx:94`

---

## Matriz de Priorizacao

| Quadrante               | Items                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Alto impacto + Facil    | #3 Breakpoints, #4 Pagination, #8 aria-labels, #15 Tooltip style, #21 Dead code, #25 CSS dup |
| Alto impacto + Dificil  | #1 Error boundaries, #2 Font vars, #5 Badges, #6 Chat props, #7 Chart a11y                   |
| Baixo impacto + Facil   | #20 branch-fields Zod, #24 Form spacing, #26 Cookie secure, #30 th scope                     |
| Baixo impacto + Dificil | #11 Shared Zod, #12 Lazy dialogs, #22 org modules, #23 API client, #28 Dependencies          |

### Quick Wins (alto impacto + facil)

1. Deletar `use-mobile.ts`, corrigir breakpoint em `use-media-query.ts` (#3)
2. Criar `<CursorPagination>` compartilhado (#4)
3. Adicionar `aria-label` nos botoes icon-only do chat (#8)
4. Extrair `CHART_TOOLTIP_STYLE` (#15)

### Investimentos Estrategicos (alto impacto + mais esforco)

1. Criar `error.tsx`, `loading.tsx`, `not-found.tsx` (#1)
2. Corrigir font CSS variables (#2)
3. Unificar badges com `<StatusBadge>` (#5)
4. Resolver prop drilling no chat com context/store (#6)

---

## Estatisticas Gerais

| Metrica                      | Valor                |
| ---------------------------- | -------------------- |
| Total de arquivos fonte      | 358                  |
| Feature modules              | 18                   |
| Componentes UI (shadcn)      | 54                   |
| Custom hooks                 | 50+                  |
| Rotas                        | 23                   |
| Componentes > 200 linhas     | 20 (excl. shadcn/ui) |
| Violacoes `any`              | 0                    |
| Violacoes `console.log`      | 0                    |
| Violacoes `eslint-disable`   | 0                    |
| Forms com Zod                | 14/15 (93%)          |
| Listings com 4 UI states     | 7/7 (100%)           |
| Pages como Server Components | 22/23 (96%)          |
| Charts com lazy loading      | 5/5 (100%)           |
| Pagination cursor-based      | 100%                 |

---

_Relatorio gerado automaticamente por Claude Opus 4.6. Verificar findings manualmente antes de implementar correcoes._
