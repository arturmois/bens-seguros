# Design — Consistência do Dashboard e fix de ordenação server-side

**Data:** 2026-04-11
**Autor:** Brainstorm Claude + Artur
**Escopo:** apps/web (frontend) + apps/server (backend) + packages/core (domain)
**Origem:** Relatório `audit/qa-report/REPORT.md` (QA Playwright + code review)

---

## 1. Contexto e motivação

A auditoria QA + code review dos 10 módulos do dashboard (`clients`, `proposals`, `policies`, `commissions`, `claims`, `endorsements`, `assistances`, `insurers`, `audit`, `chat`) identificou dois grupos de problemas:

1. **Bug funcional** — `proposals-table.tsx` e `insurers-table.tsx` usam `getSortedRowModel` do TanStack Table **sobre dados cursor-paginados**. O usuário clica num header, a UI ordena apenas os 10-20 registros da página atual, e o restante do dataset continua fora de ordem. O usuário não percebe que está vendo um sort incorreto.

2. **Drift de consistência estrutural** — o padrão `PageHeader + TableToolbar + DataTable + CursorPagination` existe mas não é aplicado uniformemente:
   - 2 páginas sem `<title>` (endorsements, chat) porque o `page.tsx` é `'use client'` e não pode exportar `metadata`
   - 2 módulos sem `<PageBreadcrumb>` (audit, endorsements)
   - CTA primário em posições diferentes: dentro do `TableToolbar` (proposals, claims, insurers, assistances) vs fora, no header da página (clients)
   - Casing inconsistente dos CTAs ("Nova proposta" vs "Novo Cliente")
   - Ícone `<Plus>` ausente em 2 botões (claims, assistances)

O objetivo deste design é resolver ambos os grupos em **dois PRs paralelos**, com o de consistência entrando primeiro (menor risco, só frontend) e o de sort server-side depois (toca backend + Orval + frontend).

---

## 2. Decisões tomadas no brainstorm

| ID  | Pergunta                                       | Decisão                                                            |
| --- | ---------------------------------------------- | ------------------------------------------------------------------ |
| D-1 | Como fatiar os fixes em PRs?                   | **Dois PRs paralelos** — (1) sort server-side, (2) consistência    |
| D-2 | Quais colunas devem ser ordenáveis no backend? | Apenas as que **já têm botão de ordenação** hoje no frontend       |
| D-3 | "Exportar CSV" em módulos que não têm?         | **Fora de escopo** — decisão de produto, ticket separado           |
| D-4 | Qual padrão de header é o alvo?                | **Padrão X (clients)** — CTA primário no header, ao lado do título |
| D-5 | Abordagem para PR 1 (sort)?                    | **Mirror do padrão `clients`** — sem abstração nova                |
| D-6 | Abordagem para PR 2 (consistência)?            | **Extrair `ListPageHeader` compartilhado** e refatorar páginas     |

---

## 3. PR 1 — Sort server-side em proposals e insurers

### 3.1 Branch e escopo

**Branch:** `feat/sort-proposals-insurers`

**Problema:** as tabelas usam `getSortedRowModel()` sem `manualSorting: true`, ordenando apenas a página atual do cursor-paginated dataset.

**Solução:** adicionar `sortBy` e `sortOrder` ao schema de query dos endpoints `GET /v1/proposals` e `GET /v1/insurers`, propagar pelos use cases e repositories, regenerar Orval, e converter as tabelas para `manualSorting: true + manualPagination: true + manualFiltering: true`.

### 3.2 Enums de sort

**Proposals:**

```ts
const proposalSortByEnum = z.enum([
  'clientName',
  'branch',
  'stage',
  'type',
  'premiumValueInCents',
  'createdAt',
])
// default: 'createdAt', default order: 'desc'
```

**Insurers:**

```ts
const insurerSortByEnum = z.enum(['name', 'code', 'isActive', 'updatedAt'])
// default: 'name', default order: 'asc'
```

### 3.3 Tradução `sortBy` → `orderBy` Prisma

**Proposals** (no repository):
| sortBy | Prisma orderBy |
| --------------------- | -------------------------------------- |
| `clientName` | `{ client: { name: order } }` (join) |
| `branch` | `{ branch: order }` |
| `stage` | `{ stage: order }` (ordem do enum) |
| `type` | `{ type: order }` (ordem do enum) |
| `premiumValueInCents` | `{ premiumValueInCents: order }` |
| `createdAt` | `{ createdAt: order }` |

**Insurers:**
| sortBy | Prisma orderBy |
| ------------ | ----------------------- |
| `name` | `{ name: order }` |
| `code` | `{ code: order }` |
| `isActive` | `{ isActive: order }` |
| `updatedAt` | `{ updatedAt: order }` |

### 3.4 Arquivos que mudam

**Backend (`apps/server` + `packages/core`):**

1. `apps/server/src/routes/v1/proposals/_schemas.ts` — adicionar `sortBy`/`sortOrder` no `listProposalsQuerySchema`
2. `apps/server/src/routes/v1/proposals/list-proposals.ts` — destructar e passar ao use case
3. `packages/core/src/modules/proposal/application/list-proposals.ts` — aceitar opções de sort
4. `packages/core/src/modules/proposal/domain/proposal-repository.ts` — ampliar `findMany` (interface)
5. `packages/core/src/modules/proposal/infrastructure/prisma-proposal-repository.ts` — `switch` para `orderBy`
6. `packages/core/src/modules/proposal/application/list-proposals.spec.ts` — novos testes
   7–12. Mesmos 6 arquivos para `insurer` / `insurers`

**Frontend (`apps/web`):** 13. `apps/web/src/api/**` — regenerado por `pnpm --filter @app/web generate:api` 14. `apps/web/src/features/proposals/hooks/use-proposals.ts` — aceitar `sortBy`/`sortOrder` 15. `apps/web/src/features/proposals/components/proposals-table.tsx`: - `manualSorting: true`, `manualPagination: true`, `manualFiltering: true` - Remover `getSortedRowModel` - Mapear `SortingState` → `{ sortBy, sortOrder }` via `useMemo` - `useEffect` reseta cursor quando `sortBy`/`sortOrder` mudam 16. `apps/web/src/features/insurers/hooks/use-insurers.ts` — idem 17. `apps/web/src/features/insurers/components/insurers-table.tsx` — idem

**Total:** ~17 arquivos (12 backend + 5 frontend, sem contar gerados do Orval).

### 3.5 Invariante crítica

Quando `sortBy` ou `sortOrder` muda, **o cursor precisa ser resetado** para `undefined`. Senão o usuário fica numa página "do meio" de um novo ordenamento. Mesma solução do `clients-table.tsx`: `useEffect` com dependência em `[sortBy, sortOrder]` chamando `pagination.reset()`.

### 3.6 Data flow

```
Clique no header "Cliente"
  → TanStack onSortingChange
  → setSorting([{ id: 'clientName', desc: false }])
  → useMemo → { sortBy: 'clientName', sortOrder: 'asc' }
  → useProposals({ ..., sortBy, sortOrder })
  → Orval: GET /api/v1/proposals?sortBy=clientName&sortOrder=asc
  → Fastify valida via Zod
  → ListProposals use case
  → PrismaProposalRepository.findMany → orderBy
  → Response { success, data, meta: { nextCursor } }
  → React Query re-fetch com novo queryKey
  → Tabela re-renderiza ordenada no servidor
```

### 3.7 Critérios de aceitação

- [ ] `GET /api/v1/proposals?sortBy=clientName&sortOrder=asc` retorna 200 com dados ordenados pelo nome do cliente
- [ ] `GET /api/v1/proposals?sortBy=INVALID` retorna 400 (validação Zod)
- [ ] `GET /api/v1/insurers?sortBy=name` retorna 200 ordenado
- [ ] Orval regenera sem erros de tipo, sem usos de `any`
- [ ] `proposals-table.tsx` e `insurers-table.tsx` usam `manualSorting: true`
- [ ] Clicar numa coluna ordena o **dataset inteiro** (validado em QA Playwright navegando entre páginas)
- [ ] Quando sort muda, o cursor reseta para a primeira página
- [ ] 5 quality gates passam: lint, typecheck, build, test, acceptance

---

## 4. PR 2 — Consistência de header e CTAs

### 4.1 Branch e escopo

**Branch:** `feat/dashboard-list-page-header`

**Problema:** drift estrutural do padrão de header entre 10 módulos (ver Seção 1).

**Solução:** extrair um componente `ListPageHeader` compartilhado que encapsula breadcrumb + título + descrição + slot de ação primária, e refatorar todas as páginas de listagem para usá-lo. No mesmo PR: converter `endorsements` e `chat` para RSC com `metadata`, padronizar casing e ícones dos CTAs.

### 4.2 Componente novo: `ListPageHeader`

**Arquivo:** `apps/web/src/components/shared/list-page-header.tsx`

```tsx
import type { ReactNode } from 'react'

import {
  PageBreadcrumb,
  type BreadcrumbItem,
} from '@/components/page-breadcrumb'

interface ListPageHeaderProps {
  readonly breadcrumb: readonly BreadcrumbItem[]
  readonly title: string
  readonly description?: string
  readonly action?: ReactNode
}

export function ListPageHeader({
  breadcrumb,
  title,
  description,
  action,
}: ListPageHeaderProps) {
  return (
    <div className="space-y-4">
      <PageBreadcrumb items={breadcrumb} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  )
}
```

**Decisões:**

- `breadcrumb` é **obrigatório** — estruturalmente impede que módulos novos apareçam sem breadcrumb
- `action` é `ReactNode` (flexível — botão, dropdown, grupo, ou nada)
- `description` é opcional
- Sem lógica — componente puro de layout, sem testes unitários necessários

### 4.3 Páginas refatoradas

Todas as páginas de listagem recebem `<ListPageHeader>` no lugar do markup inline atual:

| Página                                   | breadcrumb                                         | action                                        |
| ---------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| `clients/page.tsx`                       | Dashboard › Clientes                               | Link "+ Novo Cliente" → `/clients/new`        |
| `proposals/page.tsx`                     | Dashboard › Propostas                              | Link "+ Nova Proposta" → `/proposals/new`     |
| `policies/page.tsx`                      | Dashboard › Apólices                               | — (by design, sem criar manual)               |
| `commissions/page.tsx`                   | Dashboard › Comissões                              | — (by design)                                 |
| `claims/page.tsx`                        | Dashboard › Sinistros                              | `<ClaimCreateButton />` (client, abre dialog) |
| `assistances/page.tsx`                   | Dashboard › Assistências                           | `<AssistanceCreateButton />` (client, dialog) |
| `insurers/page.tsx`                      | Dashboard › Seguradoras                            | `<InsurerCreateButton />` (client, dialog)    |
| `audit/page.tsx`                         | Dashboard › Auditoria **(NOVO)**                   | —                                             |
| `endorsements/page.tsx` (convertido RSC) | Dashboard › Endossos **(NOVO)**                    | —                                             |
| `chat/page.tsx` (convertido RSC)         | — (chat tem layout próprio, sem breadcrumb padrão) | —                                             |

**Observação sobre chat:** o layout do chat é diferente (sidebar + detalhe), não tem o padrão de listagem. O PR 2 **apenas converte o page.tsx para RSC com `metadata`**, não aplica `ListPageHeader`. O conteúdo atual vai para `<ChatLayoutContent />`.

### 4.4 Conversão client→server (endorsements e chat)

**Problema:** hoje `endorsements/page.tsx` e `chat/page.tsx` têm `'use client'` no topo, o que impede exportar `metadata` e produz `<title>Bens Seguros</title>` genérico.

**Solução:**

1. Extrair o conteúdo client para `features/<módulo>/components/<módulo>-content.tsx` (novo arquivo)
2. `page.tsx` vira RSC com:
   ```tsx
   import type { Metadata } from 'next'
   export const metadata: Metadata = { title: 'Endossos' }
   export default function EndorsementsPage() {
     return <EndorsementsContent />
   }
   ```
3. Para endorsements, `EndorsementsContent` usa `<ListPageHeader>` + `<ProposalKanban initialBoardType="ENDORSEMENT" />`

### 4.5 CTAs com dialog encapsulado

Para módulos onde o CTA primário abre um dialog (insurers, claims, assistances), criar um pequeno client component que encapsula botão + estado + dialog:

```tsx
// apps/web/src/features/insurers/components/insurer-create-button.tsx
'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { InsurerFormDialog } from './insurer-form-dialog'

export function InsurerCreateButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nova Seguradora
      </Button>
      <InsurerFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
```

Mesmo padrão para `ClaimCreateButton` e `AssistanceCreateButton`.

Isso mantém `page.tsx` como RSC puro (apenas importa o button client component) e isola o estado do dialog.

### 4.6 Remoção do CTA da TableToolbar

Depois de mover o CTA para o `ListPageHeader`, remover das tabelas:

- `proposals-table.tsx` — remover botão "Nova proposta" da toolbar
- `claims-table.tsx` — remover "Novo Sinistro" e todas as referências ao estado do dialog
- `assistances-table.tsx` — remover "Nova Assistência"
- `insurers-table.tsx` — remover "Nova seguradora"

### 4.7 Correções adicionais (cosméticas)

- **Casing** — padronizar para Title Case: "Nova Proposta", "Nova Seguradora"
- **Ícone `<Plus>`** — garantir em todos os CTAs (já existe nos novos `*-CreateButton`)

### 4.8 Arquivos que mudam

**Novos (3):**

1. `apps/web/src/components/shared/list-page-header.tsx`
2. `apps/web/src/features/endorsements/components/endorsements-content.tsx`
3. `apps/web/src/features/chat/components/chat-layout-content.tsx` (pode ter nome diferente dependendo da estrutura atual do chat)

**Novos (CTAs encapsulados — 3):** 4. `apps/web/src/features/insurers/components/insurer-create-button.tsx` 5. `apps/web/src/features/claims/components/claim-create-button.tsx` 6. `apps/web/src/features/assistances/components/assistance-create-button.tsx`

**Páginas refatoradas (10):** 7. `apps/web/src/app/(dashboard)/clients/page.tsx` 8. `apps/web/src/app/(dashboard)/proposals/page.tsx` 9. `apps/web/src/app/(dashboard)/policies/page.tsx` 10. `apps/web/src/app/(dashboard)/commissions/page.tsx` 11. `apps/web/src/app/(dashboard)/claims/page.tsx` 12. `apps/web/src/app/(dashboard)/assistances/page.tsx` 13. `apps/web/src/app/(dashboard)/insurers/page.tsx` 14. `apps/web/src/app/(dashboard)/audit/page.tsx` 15. `apps/web/src/app/(dashboard)/endorsements/page.tsx` 16. `apps/web/src/app/(dashboard)/chat/page.tsx`

**Tabelas atualizadas (4):** 17. `apps/web/src/features/proposals/components/proposals-table.tsx` 18. `apps/web/src/features/claims/components/claims-table.tsx` 19. `apps/web/src/features/assistances/components/assistances-table.tsx` 20. `apps/web/src/features/insurers/components/insurers-table.tsx`

**Total:** 20 arquivos (6 novos + 14 editados).

### 4.9 Critérios de aceitação

- [ ] Todos os 10 módulos têm `document.title` começando com o nome do módulo (não "Bens Seguros" genérico)
- [ ] Todos os módulos de listagem têm `<PageBreadcrumb>` visível
- [ ] CTA primário está no `ListPageHeader`, **não** no `TableToolbar`, em todos os módulos com CTA
- [ ] "Nova Proposta" e "Nova Seguradora" aparecem em Title Case
- [ ] Claims e Assistances exibem `<Plus />` antes do label do CTA
- [ ] `endorsements/page.tsx` e `chat/page.tsx` são RSC (sem `'use client'`) e exportam `metadata`
- [ ] Clicar "Novo Cliente" continua navegando para `/clients/new`
- [ ] Clicar "Nova Seguradora", "Novo Sinistro", "Nova Assistência" abre dialog
- [ ] Screenshots Playwright desktop+mobile dos 10 módulos sem regressão visual
- [ ] 5 quality gates passam: lint, typecheck, build, test, acceptance

---

## 5. Testing

### 5.1 PR 1

**Unit (`packages/core`):**

- `list-proposals.spec.ts`:
  - `it('orders by clientName asc when sortBy=clientName and sortOrder=asc')`
  - `it('orders by createdAt desc by default')`
  - `it('orders by premiumValueInCents desc when sortBy=premiumValueInCents')`
  - `it('orders by stage in enum order')`
- `list-insurers.spec.ts` — versões equivalentes, default `name`.

**Integration (`apps/server`):**

- `GET /api/v1/proposals?sortBy=clientName&sortOrder=asc` → 200 ordenado
- `GET /api/v1/proposals?sortBy=INVALID` → 400 Zod
- `GET /api/v1/insurers?sortBy=name` → 200 ordenado

**QA Playwright:**

- Navegar para `/proposals`, clicar no header "Cliente", validar que a request inclui `sortBy=clientName`
- Clicar duas vezes, validar `sortOrder=desc` e que a ordem visual muda
- Mudar sort + mudar de página → cursor reseta, volta para a primeira
- Idem para `/insurers`

### 5.2 PR 2

**Structural (QA Playwright, via `browser_evaluate`):**

- Para cada página de listagem:
  - `document.title` começa com o nome do módulo
  - `document.querySelector('[aria-label="breadcrumb"]')` existe
  - `document.querySelector('h1')?.textContent` é o título esperado
  - Em módulos com CTA: `document.querySelector('[data-slot="toolbar"] button[data-cta-primary]')` é `null` (CTA não está dentro da toolbar)

**Visual:**

- Screenshots desktop (1440×900) + mobile (375×812) dos 10 módulos em `audit/qa-report/after-fixes/`
- Comparação visual manual contra os screenshots atuais em `audit/qa-report/screenshots/`

**Smoke manual:**

- Navegação primária: clicar "Novo Cliente" → `/clients/new`
- Dialogs: "Nova Seguradora", "Novo Sinistro", "Nova Assistência" → abrem overlay
- Mobile: CTA do header visível em 375px sem overflow

### 5.3 Sem novos testes unitários de componente

`ListPageHeader` é puro layout (sem lógica, sem hooks). Testes de componente do shadcn/coss style não fazem parte da cobertura atual do projeto (outros shared primitives como `DataTable`, `CursorPagination` também não têm testes unitários de componente). Cobertura vem do QA Playwright.

---

## 6. Rollout

### 6.1 Ordem

1. **PR 2 primeiro** (consistência, frontend-only, risco baixo).
2. **PR 1 depois** (sort server-side, toca backend + Orval + frontend, risco moderado).

**Razão:** PR 2 reorganiza o header das páginas. PR 1 toca as mesmas duas tabelas (`proposals-table.tsx`, `insurers-table.tsx`) mas em seções distintas (`useReactTable` config vs remoção do CTA da toolbar). Fazendo PR 2 primeiro, o PR 1 rebaseia sobre código já reorganizado e tem menos conflito.

### 6.2 Feature flags

Nenhuma. Ambas as mudanças são diretas, sem comportamento opcional.

### 6.3 Migração de dados

Nenhuma.

### 6.4 Breaking changes de API

- **PR 1:** adiciona params `sortBy`/`sortOrder` opcionais com defaults. Clientes existentes não quebram — quem não enviar recebe o comportamento default (que é o default atual do backend).
- **PR 2:** zero API changes.

### 6.5 Rollback

Ambos os PRs são `git revert` simples. Sem migrações, sem estado persistido, sem feature flags para remover.

---

## 7. Fora de escopo (backlog explícito)

- Refatoração dos 5 arquivos acima de 200 linhas (`proposal-detail.tsx`, `branch-field-sets-property.tsx`, `proposal-kanban.tsx`, `branch-field-sets.tsx`, `issue-policy-dialog.tsx`) — refactoring puro, PR dedicado.
- Adicionar "Exportar CSV" em claims/assistances/insurers — decisão de produto.
- Documentar convenção FilterTabs vs Select em `docs/UI-PATTERNS.md` — tarefa de documentação.
- Auditoria de `localStorage` por vazamento de PII — ticket de segurança.
- Validação de Helmet + CSP em produção — ticket de segurança/DevOps.
- Confirmação de idempotência dos GETs (React Strict Mode double-fetch) — revisão arquitetural.

---

## 8. Riscos e mitigações

| Risco                                                                | Impacto | Mitigação                                                            |
| -------------------------------------------------------------------- | ------- | -------------------------------------------------------------------- |
| `sortBy: clientName` exige join no Prisma — pode ser lento em volume | Médio   | Índice em `client.name` já existe; testar com seed + explain         |
| Esquecer de resetar cursor quando sort muda                          | Alto    | `useEffect` explícito + teste QA Playwright que navega entre páginas |
| Dialog do CTA deslocado quebra estado atual (claims/assistances)     | Médio   | Encapsular em `*CreateButton` isolado — estado local, sem props      |
| Rebase do PR 1 sobre PR 2 com conflitos                              | Baixo   | Ordem explícita de merge (PR 2 → PR 1); seções distintas das tabelas |
| `ListPageHeader` não acomoda algum caso futuro (ex: ações múltiplas) | Baixo   | `action: ReactNode` permite qualquer composição (grupo, dropdown)    |
| Orval regenerado introduz tipos inesperados                          | Baixo   | `pnpm typecheck` pega; rodar antes de commit                         |

---

## 9. Referências

- Relatório QA original: `audit/qa-report/REPORT.md`
- Screenshots: `audit/qa-report/screenshots/01-clients-desktop.png` … `12-proposals-mobile.png`
- Logs: `audit/qa-report/logs/network-requests.log`, `audit/qa-report/logs/console-messages.log`
- Pattern de sort existente: `apps/server/src/routes/v1/clients/_schemas.ts:64-68`, `apps/web/src/features/clients/components/clients-table.tsx`
- Shared primitives: `project_shared_table_primitives` na memória do agente
