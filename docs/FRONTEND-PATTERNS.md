# Bens Seguros - Frontend Performance & Component Patterns

> Padroes de React/Next.js baseados nas Vercel React Best Practices.
> Complementa `UI-PATTERNS.md` (visual) com regras tecnicas (performance, arquitetura).

---

## 1. Server Components vs Client Components

**Regra:** Server-first com boundaries claros.

### Quando usar Server Component (default)

- Pages (`page.tsx`) e layouts (`layout.tsx`)
- Busca de dados iniciais
- Conteudo SEO-critico
- Componentes sem interatividade (badges, cards estaticos, breadcrumbs)

### Quando usar `"use client"`

- useState, useEffect, useRef
- Event handlers (onClick, onChange, onSubmit)
- Browser APIs (localStorage, IntersectionObserver)
- Hooks de terceiros (React Hook Form, React Query, Socket.IO)
- Animacoes (Framer Motion)

### Regra de Serializacao (`server-serialization`)

```tsx
// ERRADO - serializa 50 campos do client para o componente
async function Page() {
  const client = await fetchClient(id)
  return <ClientCard client={client} />
}

// CERTO - serializa apenas campos usados
async function Page() {
  const client = await fetchClient(id)
  return (
    <ClientCard
      name={client.name}
      document={client.document}
      status={client.type}
    />
  )
}
```

Nunca passar objeto inteiro de Server para Client Component. Passar apenas campos usados.

---

## 2. Suspense Boundaries

**Regra:** Suspense por zona de conteudo, nunca bloquear layout inteiro.

### Estrutura de Page

```tsx
// page.tsx (Server Component)
export default function ClientsPage() {
  return (
    <div>
      <PageHeader title="Clientes" /> {/* Renderiza imediato */}
      <Toolbar /> {/* Renderiza imediato */}
      <Suspense fallback={<TableSkeleton />}>
        <ClientsTable /> {/* Busca dados async */}
      </Suspense>
    </div>
  )
}

async function ClientsTable() {
  const data = await fetchClients() // So bloqueia este componente
  return <ClientsTableClient initialData={data} />
}
```

### Estrutura de Detalhe (Tabs)

```tsx
export default function ClientDetailPage({ params }) {
  return (
    <div>
      <Suspense fallback={<HeaderSkeleton />}>
        <ClientHeader id={params.id} /> {/* Suspense proprio */}
      </Suspense>
      <TabsContainer>
        <Suspense fallback={<TableSkeleton />}>
          <ProposalsTab clientId={params.id} /> {/* Cada tab independente */}
        </Suspense>
      </TabsContainer>
    </div>
  )
}
```

### Regras

- Layout (sidebar, header, footer) NUNCA dentro de Suspense
- Cada tab de detalhe tem seu Suspense (lazy load ao ativar)
- Skeleton replica layout real do conteudo (nao spinner generico)
- Componentes async irmãos dentro de um Suspense buscam dados em paralelo (`server-parallel-fetching`)
- Skeleton aparece apos 50ms (nao flash em loads rapidos)

### Quando NAO usar Suspense

- Dados criticos para SEO (await no server, renderiza no HTML)
- Queries <100ms (overhead nao vale)
- Dados que afetam layout (evita CLS)

---

## 3. Hydration Mismatches - Prevencao

### Tema / Dark Mode

- `next-themes` resolve com script inline (zero flicker)
- Nenhuma acao necessaria

### Dados do Browser (localStorage, timezone)

```tsx
// ERRADO - diverge server/client
function Component() {
  const density = localStorage.getItem('density') // Erro no server
}

// CERTO - Zustand com persist middleware + skeleton
function Component() {
  const [mounted, setMounted] = useState(false)
  const density = useUiStore((s) => s.density)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <Skeleton />

  return <Table density={density} />
}
```

### Dados de Sessao

- Buscar via cookies no Server Component (Better Auth)
- Nunca depender de localStorage para auth state

### Datas e Moeda

```tsx
// CERTO - locale fixo garante server == client
const formatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
```

### Regra

Nunca renderizar no server algo que depende de estado do browser. Se precisa de browser API, render skeleton no server e sincronizar no client.

---

## 4. Data Fetching

### Listagens e Detalhes (Server + React Query)

```tsx
// page.tsx (Server Component)
async function ClientsPage({ searchParams }) {
  const data = await api.listClients(searchParams)

  return <ClientsTableClient initialData={data} filters={searchParams} />
}

// clients-table.tsx (Client Component)
;('use client')
function ClientsTableClient({ initialData, filters }) {
  const { data } = useQuery({
    queryKey: ['clients', filters],
    queryFn: () => api.listClients(filters),
    initialData, // First paint instantaneo do server
    staleTime: 60_000, // Revalida apos 1 min
  })

  return <DataTable data={data} />
}
```

### Mutacoes (React Query)

```tsx
const createClient = useMutation({
  mutationFn: api.createClient,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] })
    toast.success('Cliente criado')
  },
  onError: (error) => {
    toast.error(error.message)
  },
})
```

### Real-time (Socket.IO)

```tsx
useEffect(() => {
  socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, (message) => {
    queryClient.setQueryData(['messages', conversationId], (old) => [
      ...old,
      message,
    ])
  })
}, [])
```

### Regras

- Server Action apenas para `revalidatePath`/`revalidateTag`, nunca logica de negocio
- API Fastify e o backend real, React Query e o cache layer
- `staleTime: 60_000` como default global
- Mutations sempre invalidam queries relacionadas
- Socket.IO eventos invalidam/atualizam cache React Query

---

## 5. Dynamic Imports (Code Splitting)

### Sempre dynamic (`next/dynamic` com `ssr: false`)

| Componente                    | Motivo                                |
| ----------------------------- | ------------------------------------- |
| `@react-pdf/renderer`         | ~200KB, usado apenas em export PDF    |
| Recharts / charts             | ~150KB, abaixo do fold no dashboard   |
| `@dnd-kit` Kanban board       | ~80KB, view alternativa (nao default) |
| Sheet de filtros avancados    | Abaixo do fold, sob demanda           |
| Modais/dialogs de confirmacao | Renderiza apenas quando aberto        |
| Componentes admin-only        | Condicional por role                  |

### Sempre import normal

| Componente                                   | Motivo                     |
| -------------------------------------------- | -------------------------- |
| shadcn/ui base (Button, Input, Dialog shell) | Leve, usado everywhere     |
| DataTable                                    | Core da app, acima do fold |
| Formularios                                  | Acima do fold ao navegar   |
| Sidebar, Header                              | Layout permanente          |
| Skeletons                                    | Fallback de Suspense       |

### Pattern

```tsx
import dynamic from 'next/dynamic'

const KanbanBoard = dynamic(
  () =>
    import('@/features/proposals/components/kanban-board').then(
      (m) => m.KanbanBoard
    ),
  { ssr: false, loading: () => <KanbanSkeleton /> }
)

const PdfExport = dynamic(
  () => import('@/features/commissions/components/pdf-export'),
  {
    ssr: false,
  }
)
```

---

## 6. Regras de Criacao de Componentes

### 3 Camadas

```
components/
  ui/                    # Camada 1: shadcn/ui base
    button.tsx
    input.tsx
    dialog.tsx
  layout/                # Camada 2: Shared (composicoes reutilizaveis)
    app-shell.tsx
    page-header.tsx
  data-table/            # Camada 2: Shared
    data-table.tsx
    data-table-toolbar.tsx
    data-table-pagination.tsx
  empty-state.tsx        # Camada 2: Shared
  status-badge.tsx       # Camada 2: Shared

features/
  clients/
    components/          # Camada 3: Feature
      clients-table.tsx
      client-form.tsx
      client-detail.tsx
```

### Regras de Dependencia

```
UI ← Shared ← Feature
(nunca na direcao contraria)
```

- **UI:** zero logica de negocio. Props genericas. Nunca importa features ou shared
- **Shared:** composicoes reutilizaveis. Importa UI. Nunca importa features
- **Feature:** logica de dominio. Importa UI e Shared. Nunca importa outra feature

### Regras de Estrutura

| Regra                                 | Descricao                                                        |
| ------------------------------------- | ---------------------------------------------------------------- |
| Max 200 linhas                        | Extrair sub-componentes se passar                                |
| `"use client"` explicito              | Todo Client Component deve ter na primeira linha                 |
| Props tipadas com interface           | `interface ClientFormProps { }`, nunca inline `{ }`              |
| Nunca componente dentro de componente | Causa remount a cada render. Extrair para arquivo separado       |
| Um componente por arquivo             | Excecao: sub-componentes privados pequenos (<30 linhas)          |
| Arquivo = kebab-case                  | `client-form.tsx`, `status-badge.tsx`                            |
| Componente = PascalCase               | `ClientForm`, `StatusBadge`                                      |
| Export nomeado                        | `export function ClientForm()`, nunca `export default`           |
| Sem barrel files pesados              | Import direto: `from './client-form'`, nao `from './components'` |

### Anatomia de um Componente

```tsx
'use client'

import { useState } from 'react' // React imports
import { useForm } from 'react-hook-form' // Third-party
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button' // UI layer
import { Form } from '@/components/ui/form'
import { PageHeader } from '@/components/layout/page-header' // Shared layer

import { useCreateClient } from '../hooks/use-clients' // Feature layer
import type { Client } from '../types'

// Schema colocado com o componente que usa
const formSchema = z.object({
  name: z.string().min(2),
  document: z.string().min(11),
})

type FormValues = z.infer<typeof formSchema>

interface ClientFormProps {
  onSuccess?: () => void
  defaultValues?: Partial<FormValues>
}

export function ClientForm({ onSuccess, defaultValues }: ClientFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  const createClient = useCreateClient()

  function handleSubmit(values: FormValues) {
    createClient.mutate(values, { onSuccess })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>{/* campos */}</form>
    </Form>
  )
}
```

---

## 7. Otimizacao de Re-renders

### React Compiler (automatico)

- Habilitado no Next.js 16 (`reactCompiler: true` em next.config.ts)
- Memoiza automaticamente componentes, valores e callbacks
- **NAO usar** `React.memo`, `useMemo`, `useCallback` manualmente

### Patterns Estruturais (complementam o Compiler)

**Composicao via children:**

```tsx
// Parent re-render NAO afeta children
function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  return (
    <div>
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />
      {children} {/* Nao re-renderiza quando sidebar muda */}
    </div>
  )
}
```

**Zustand com selectors granulares:**

```tsx
// ERRADO - re-render em qualquer mudanca do store
const store = useUiStore()

// CERTO - re-render apenas quando density muda
const density = useUiStore((s) => s.density)
```

**useRef para valores transientes:**

```tsx
// Posicao de scroll, timers, valores que mudam muito rapido
const scrollY = useRef(0)
onScroll={(e) => { scrollY.current = e.target.scrollTop }}
```

**startTransition para updates nao-urgentes:**

```tsx
function handleSearch(query: string) {
  setSearchInput(query) // Urgente: atualiza input
  startTransition(() => {
    setSearchFilter(query) // Nao-urgente: atualiza tabela
  })
}
```

**Constantes fora do componente:**

```tsx
// ERRADO - cria novo array a cada render
function Component() {
  return <Select options={[{ label: 'A' }, { label: 'B' }]} />
}

// CERTO - referencia estavel
const OPTIONS = [{ label: 'A' }, { label: 'B' }] as const

function Component() {
  return <Select options={OPTIONS} />
}
```

---

## 8. Preload e Perceived Performance

### Link Prefetch

```tsx
// Sidebar - prefetch apenas rotas mais acessadas
<Link href="/" prefetch={true}>Dashboard</Link>
<Link href="/clients" prefetch={true}>Clientes</Link>
<Link href="/proposals" prefetch={true}>Propostas</Link>
<Link href="/settings" prefetch={false}>Config</Link>  {/* Menos acessada */}
```

### Hover Preload (Tabela)

```tsx
function TableRow({ client }) {
  const queryClient = useQueryClient()

  function handleMouseEnter() {
    queryClient.prefetchQuery({
      queryKey: ['client', client.id],
      queryFn: () => api.getClient(client.id),
      staleTime: 30_000,
    })
  }

  return (
    <tr
      onMouseEnter={handleMouseEnter}
      onClick={() => router.push(`/clients/${client.id}`)}
    >
      {/* ... */}
    </tr>
  )
}
```

### Optimistic Mutations

```tsx
const updateClient = useMutation({
  mutationFn: api.updateClient,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['client', id] })
    const previous = queryClient.getQueryData(['client', id])
    queryClient.setQueryData(['client', id], (old) => ({ ...old, ...newData }))
    return { previous }
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['client', id], context?.previous) // Rollback
    toast.error('Erro ao atualizar')
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['client', id] })
  },
})
```

### Regras

- Usuario nunca ve tela branca entre navegacoes
- Skeleton aparece em <50ms via Suspense fallback
- Prefetch de detalhe ao hover na tabela (150ms debounce)
- Mutations otimistas para create/update, rollback se falhar
- Prefetch `true` apenas nas 3-4 rotas mais acessadas do sidebar

---

## 9. Decisoes Registradas

| #    | Padrao           | Escolha                                                                                               |
| ---- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| FE-1 | Server vs Client | Server-first, `"use client"` apenas para interatividade, props minimas                                |
| FE-2 | Suspense         | Por zona de conteudo, nunca bloqueia layout, tabs independentes                                       |
| FE-3 | Hydration        | Prevencao por camada (next-themes, locale fixo, skeleton para browser APIs)                           |
| FE-4 | Data Fetching    | Server busca inicial + React Query rehidrata, mutations via React Query                               |
| FE-5 | Dynamic Imports  | Seletivo: charts, PDF, kanban, modais. Normal: shadcn, tabelas, forms                                 |
| FE-6 | Componentes      | 3 camadas (UI/Shared/Feature), max 200 linhas, export nomeado                                         |
| FE-7 | Re-renders       | React Compiler + patterns estruturais (children, selectors, startTransition)                          |
| FE-8 | Preload          | Hover prefetch, optimistic mutations, prefetch sidebar top 3-4 rotas                                  |
| FE-9 | Shared Table     | 6 primitives (DataTable, CursorPagination, FilterTabs, TableToolbar, MobileCardList, TableErrorState) |

---

## 10. Shared Table Primitives

Template reutilizavel para todas as listagens do ERP. Implementado em Clients e Commissions, planejado para os 11 modulos.

### Componentes (`components/shared/`)

| Componente         | Responsabilidade                                                     | Visibilidade     |
| ------------------ | -------------------------------------------------------------------- | ---------------- |
| `DataTable`        | Tabela desktop com headers, skeleton loading, empty state, row click | `hidden md:flex` |
| `MobileCardList`   | Lista de cards para mobile com skeleton e empty state                | `md:hidden`      |
| `TableToolbar`     | Busca, seletor de colunas (popover), acoes (export, import)          | Sempre visivel   |
| `FilterTabs`       | Abas de filtro rapido (status, tipo) com estilo pill                 | Sempre visivel   |
| `CursorPagination` | Paginacao cursor-based com seletor de page size                      | Sempre visivel   |
| `TableErrorState`  | Estado de erro com botao "Tentar novamente"                          | Condicional      |

### Anatomia de um modulo de listagem

```
features/<module>/
  components/
    <module>-table.tsx       # Orquestra tudo: state, hooks, primitives
    <module>-columns.tsx     # ColumnDef[] para TanStack Table
    <module>-card.tsx        # Card para MobileCardList
    <module>-export-button.tsx
  hooks/
    use-<module>.ts          # React Query hooks (Orval) + mutations com toast
  lib/
    constants.ts             # STATUS_LABELS, FILTER_OPTIONS, DEFAULT_SORTING,
                             # DEFAULT_COLUMN_VISIBILITY, HIDEABLE_COLUMNS
    types.ts                 # Type aliases de @/api/model
    type-guards.ts           # isSortBy(), isStatus() type guards
```

### Exemplo: wiring completo (`<module>-table.tsx`)

```tsx
export function CommissionsTable() {
  const pagination = useCursorPagination()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )

  // Type-safe sort derivation
  const sortBy =
    sorting[0]?.id && isSortBy(sorting[0].id) ? sorting[0].id : undefined
  const sortOrder = sorting[0]?.desc ? 'desc' : 'asc'

  // Orval hook (React Query)
  const { data, isLoading, isError, refetch } = useCommissions({
    search,
    status: statusParam,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
    sortBy,
    sortOrder,
  })

  const table = useReactTable({
    data: commissions,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: (updater) => {
      setSorting(updater)
      pagination.reset()
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
  })

  if (isError) return <TableErrorState onRetry={refetch} />

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <FilterTabs
        options={STATUS_FILTER_OPTIONS}
        value={statusFilter}
        onChange={handleStatusFilterChange}
      />
      <TableToolbar
        search={search}
        onSearchChange={handleSearchChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      />
      <DataTable
        table={table}
        isLoading={isLoading}
        columnVisibility={columnVisibility} // REQUIRED for header sync
        emptyIcon={<DollarSign className="text-muted-foreground/50 size-10" />}
        emptyMessage="Nenhuma comissao encontrada."
        emptyDescription="As comissoes serao criadas automaticamente ao emitir apolices."
        onRowClick={(row) => router.push(`/commissions/${row.id}`)}
      />
      <MobileCardList
        data={commissions}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyIcon={<DollarSign className="text-muted-foreground/50 size-10" />}
        emptyMessage="Nenhuma comissao encontrada."
        renderCard={(commission) => <CommissionCard commission={commission} />}
      />
      <CursorPagination
        total={total}
        pageSize={pagination.pageSize}
        currentPage={pagination.currentPage}
        hasPreviousPage={pagination.hasPreviousPage}
        hasNextPage={Boolean(nextCursor)}
        onPrevious={pagination.goToPrevious}
        onNext={() => nextCursor && pagination.goToNext(nextCursor)}
        onPageSizeChange={pagination.setPageSize}
      />
    </div>
  )
}
```

### Regras criticas

| Regra                                                    | Motivo                                                                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sempre passar `columnVisibility` prop ao `DataTable`** | TanStack Table `getState()` pode retornar estado stale para headers. O prop direto garante sync header/cells                                 |
| **`manualSorting: true` + `manualPagination: true`**     | Sorting e paginacao sao server-side, nunca client-side                                                                                       |
| **`pagination.reset()` ao mudar sort/filtro/search**     | Evita cursor invalido ao mudar contexto de listagem                                                                                          |
| **Columns com `enableHiding: false`**                    | Colunas que NAO devem ser ocultaveis (ex: nome, status, valor) precisam de `enableHiding: false` na coluna E nao estar em `HIDEABLE_COLUMNS` |
| **`DEFAULT_COLUMN_VISIBILITY` com todos `true`**         | Todas as colunas ocultaveis comecam visiveis. Para ocultar por default, setar `false`                                                        |
| **Type guards (`isSortBy`, `isStatus`)**                 | Validam strings antes de passar para a API. Derivados dos enums Orval                                                                        |
| **Empty state com icon + description**                   | `emptyIcon` (lucide) + `emptyMessage` + `emptyDescription` explicando contexto                                                               |

### Backend: server-side sorting

Cada modulo precisa de um tipo de sort field no dominio e `buildOrderBy` tipado no repository:

```ts
// domain/commission-repository.ts
export type CommissionSortField =
  | 'salespersonName'
  | 'status'
  | 'commissionValueInCents'
  | 'createdAt'

// infrastructure/prisma-commission-repository.ts
function buildOrderBy(
  sortBy: CommissionSortField | undefined,
  sortOrder: SortOrder | undefined
): Prisma.CommissionOrderByWithRelationInput[] {
  const order = sortOrder === 'asc' ? 'asc' : 'desc'
  if (sortBy === 'salespersonName') {
    return [{ salesperson: { name: order } }, { id: 'desc' }]
  }
  const field = sortBy ?? 'createdAt'
  return [{ [field]: order }, { id: 'desc' }]
}
```

A interface `CursorPage<TSortBy>` e generica — cada modulo define seu proprio tipo de sort field:

```ts
// CursorPage<ClientSortField> para clients
// CursorPage<CommissionSortField> para commissions
// CursorPage (default string) para modulos sem sorting
```
