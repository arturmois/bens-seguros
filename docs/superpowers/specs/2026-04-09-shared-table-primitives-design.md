# Shared Table Primitives & Utils Consolidation

> Design spec para extracão de componentes genéricos de tabela e consolidação de utilitários compartilhados.
> Todas as tabelas do sistema seguirão o padrão Clients (TanStack Table + sorting + column visibility + mobile cards).

## Contexto

O recurso Clients foi redesenhado com TanStack Table, cursor-based pagination, column visibility, sorting e mobile cards. O padrão será expandido para todos os 12 módulos do sistema. Code review identificou que 7 componentes da feature são genéricos e vários utilitários estão duplicados.

### Decisões já tomadas

- **Todas** as tabelas terão sorting + column visibility (TanStack obrigatório)
- **Todas** terão mobile cards dedicados (não apenas colunas escondidas)
- Consolidação de shared utils acontece junto com extração de tabela
- **Abordagem: composição via primitivas** (não monolítico)

## Arquitetura: Composição de Primitivas

Componentes pequenos e independentes. Cada módulo orquestra na sua `*-table.tsx` (~100 linhas).

```
Orquestrador (por módulo)
├── FilterTabs (shared)
├── TableToolbar (shared) + children (domain actions)
├── DataTable<T> (shared) — desktop
├── MobileCardList<T> (shared) + renderCard (domain)
├── CursorPagination (shared)
└── ConfirmDeleteDialog (shared) — se aplicável
```

### Por que composição e não monolítico

1. Cada módulo tem 1-2 edge cases (LostReasonDialog em Proposals, CancelFlow em Policies, bulk actions em Commissions) — composição permite sem escape hatches
2. Cada primitiva tem single responsibility, testa isolado
3. O orquestrador lê como uma receita do que a tabela faz
4. Mudar uma primitiva não quebra as outras

## Componentes Shared

### `DataTable<T>` — `@/components/shared/data-table.tsx`

Renderer TanStack genérico. Renderiza headers via `flexRender`, cells via `getVisibleCells()`, skeleton rows no loading, empty state quando sem dados.

```ts
interface DataTableProps<T> {
  readonly table: TanStackTable<T>
  readonly isLoading: boolean
  readonly emptyMessage?: string // default "Nenhum registro encontrado."
  readonly emptyIcon?: ReactNode
  readonly onRowClick?: (row: T) => void
  readonly skeletonRows?: number // default 5
}
```

Row click guard: `target.closest('button, [role="menu"], [role="menuitem"], [role="dialog"], a')`.

Classe `hidden md:block` — escondido no mobile (cards assumem).

### `MobileCardList<T>` — `@/components/shared/mobile-card-list.tsx`

```ts
interface MobileCardListProps<T> {
  readonly data: T[]
  readonly renderCard: (item: T) => ReactNode
  readonly isLoading?: boolean
  readonly skeletonCount?: number // default 3
  readonly emptyMessage?: string
}
```

Classe `md:hidden` — visível apenas no mobile. Loading mostra skeleton cards. O `renderCard` é domain-specific (cada módulo define seu card).

### `CursorPagination` — `@/components/shared/cursor-pagination.tsx`

```ts
interface CursorPaginationProps {
  readonly total: number
  readonly pageSize: number
  readonly onPageSizeChange: (size: number) => void
  readonly hasPreviousPage: boolean
  readonly hasNextPage: boolean
  readonly onPrevious: () => void
  readonly onNext: () => void
  readonly pageSizeOptions?: number[] // default [10, 20, 50]
}
```

Mostra "X-Y de Z resultados", selector de page size, botões anterior/próximo.

### `FilterTabs` — `@/components/shared/filter-tabs.tsx`

```ts
interface FilterTabsProps {
  readonly options: readonly { value: string; label: string }[]
  readonly value: string
  readonly onChange: (value: string) => void
}
```

Botões inline com estilo de tab ativa. Primeiro item é sempre "Todos" (value: `""`).

### `TableToolbar` — `@/components/shared/table-toolbar.tsx`

```ts
interface TableToolbarProps {
  readonly search: string
  readonly onSearchChange: (value: string) => void
  readonly searchPlaceholder?: string // default "Buscar..."
  readonly columnVisibility?: VisibilityState
  readonly onColumnVisibilityChange?: (id: string, visible: boolean) => void
  readonly hideableColumns?: readonly { id: string; label: string }[]
  readonly children?: ReactNode // slot para action buttons
}
```

Search input com ícone (padding `ps-9`) + Popover shadcn para column visibility + children slot para botões de ação (import, export, criar, etc.). Se `columnVisibility` não for passado, o toggle não renderiza.

### `TableErrorState` — `@/components/shared/table-error-state.tsx`

```ts
interface TableErrorStateProps {
  readonly message?: string // default "Erro ao carregar dados."
  readonly onRetry: () => void
}
```

Div centralizada com mensagem destructive + botão "Tentar novamente".

### `ConfirmDeleteDialog` — `@/components/shared/confirm-delete-dialog.tsx`

```ts
interface ConfirmDeleteDialogProps {
  readonly entityLabel: string // "cliente", "proposta", "apólice"
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onConfirm: () => void
  readonly isPending: boolean
}
```

AlertDialog com título "Excluir {entityLabel}?" e mensagem de confirmação. Extraído de `delete-client-dialog.tsx`.

### `DetailInfoItem` — `@/components/shared/detail-info-item.tsx`

```ts
interface DetailInfoItemProps {
  readonly icon: ReactNode
  readonly label: string
  readonly value: string
}
```

Componente icon + label + value para páginas de detalhe. Extraído de `client-detail-info.tsx`.

## Hook

### `useCursorPagination` — `@/hooks/use-cursor-pagination.ts`

```ts
interface UseCursorPaginationReturn {
  currentCursor: string | undefined
  hasPreviousPage: boolean
  goToNext: (nextCursor: string) => void
  goToPrevious: () => void
  reset: () => void
  pageSize: number
  setPageSize: (size: number) => void
}

function useCursorPagination(
  initialPageSize?: number
): UseCursorPaginationReturn
```

Encapsula o padrão `cursors[]` stack. `reset()` é chamado quando filtro/sort/search muda. `setPageSize` também reseta cursors. Default `initialPageSize: 10`.

## Shared Utils (consolidação)

### `extractErrorMessage` — `@/lib/extract-error-message.ts`

Move de `features/clients/hooks/use-clients.ts`. Fix: trocar `as` assertion por type guard completo.

```ts
function extractErrorMessage(error: unknown, fallback: string): string
```

Narrowing chain: verifica `error.response.data.error.message` sem nenhum `as`.

### `getInitials` — adicionar em `@/lib/formatters.ts`

Move de `features/clients/lib/formatters.ts`. Já existe `@/lib/formatters.ts` — adicionar lá.

### `formatDate` — padronizar em `@/lib/formatters.ts`

Versão canônica: `Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })`.
Output: `09 de abr. de 2026`. Deletar versão divergente de `features/clients/lib/formatters.ts`.

### `parseDateString` e `formatDateToISO` — `@/lib/date-utils.ts`

Move de `features/clients/components/client-form-fields.tsx`. Funções puras de conversão de data.

### `FormField` — `@/components/shared/form-field.tsx`

Versão canônica: a de `features/clients/components/form-field.tsx` (com `useId` + `cloneElement` + `aria-describedby`). Deletar cópia local da feature clients. A versão em `components/ui/form-field.tsx` (shadcn) permanece como primitiva base.

## Impacto no módulo Clients (cobaia)

### Arquivos deletados (absorvidos pelos genéricos)

- `clients-data-table.tsx` → `DataTable<ClientData>`
- `clients-pagination.tsx` → `CursorPagination`
- `clients-filter-tabs.tsx` → `FilterTabs`
- `clients-toolbar.tsx` → `TableToolbar` + children
- `client-cards.tsx` → `MobileCardList` + novo `client-card.tsx`
- `client-detail-info.tsx` → `DetailInfoItem`
- `delete-client-dialog.tsx` → `ConfirmDeleteDialog`
- `form-field.tsx` (cópia local) → `@/components/shared/form-field.tsx`

### Arquivos mantidos (domain-specific)

- `clients-columns.tsx` — ColumnDef<ClientData>[]
- `client-card.tsx` — layout do card mobile (renomeado de client-cards.tsx)
- `clients-table.tsx` — orquestrador (~100 linhas)
- `client-form.tsx`, `client-form-fields.tsx`, `identification-fields.tsx`, `personal-info-fields.tsx`, `social-media-fields.tsx`
- `client-detail.tsx`, `client-detail-skeleton.tsx`

### Arquivos atualizados (imports)

- `client-form-fields.tsx` — remove `parseDateString`/`formatDateToISO` (importa de `@/lib/date-utils`)
- `use-clients.ts` — remove `extractErrorMessage` (importa de `@/lib`)
- `client-detail.tsx` — importa `DetailInfoItem` e `ConfirmDeleteDialog` do shared
- `clients-table.tsx` — reescrito para usar primitivas genéricas

## Template para novos módulos

### Criar (domain-specific)

- `lib/types.ts` — tipo canônico do form + aliases Orval
- `lib/constants.ts` — labels, badges, filter options, column defaults, empty form values
- `lib/type-guards.ts` — guards para sort fields e enums
- `hooks/use-<module>.ts` — CRUD hooks (importa `extractErrorMessage` de `@/lib`)
- `components/<module>-columns.tsx` — ColumnDef
- `components/<module>-card.tsx` — card mobile
- `components/<module>-table.tsx` — orquestrador
- `components/<module>-form.tsx` — form
- `components/<module>-detail.tsx` — detail
- Pages: `page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`

### Importar do shared

- `DataTable`, `MobileCardList`, `CursorPagination`, `FilterTabs`, `TableToolbar`, `TableErrorState`
- `ConfirmDeleteDialog`, `DetailInfoItem`, `FormField`
- `useCursorPagination`
- `extractErrorMessage`, `getInitials`, `formatDate`, `parseDateString`, `formatDateToISO`
- `PageBreadcrumb`

### Regra

> Se o componente não contém texto, lógica ou layout específico do domínio → shared.
> Se contém → feature.

## Validação

### Quality gates

Após refatoração, todos devem passar:

1. `pnpm typecheck` — zero errors
2. `pnpm lint` — zero errors
3. `pnpm build` — successful
4. QA Playwright — Clients funciona identicamente ao antes

### Critério de sucesso

- Clients funciona igual ao antes (zero regressão visual ou funcional)
- 7 arquivos client-specific deletados
- 7 componentes shared criados + 1 hook + 5 utils movidos
- `clients-table.tsx` orquestrador com <=120 linhas
- Qualquer dev pode criar um novo módulo seguindo o template sem copiar código genérico
