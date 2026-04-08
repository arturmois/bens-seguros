# Redesign Tabela de Clientes — Padrao Zenith

> Spec para migrar a listagem de clientes (`/clients`) e formulario de criacao
> para o padrao visual do Zenith Dashboard, usando @tanstack/react-table como
> renderizador controlado com dados server-side.

**Referencia visual:** https://zenith-dashboard.pages.dev/orders
**Documento de analise:** `ui/zenith-design-system-analysis.md`
**Modulo alvo:** `apps/web/src/features/clients/`

---

## 1. Decisoes de Design

| Aspecto           | Decisao                                                                                         | Justificativa                                              |
| ----------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Filtros por tipo  | Tab group visual (Todos \| Lead \| Cliente \| Ex-cliente)                                       | Padrao Zenith, mais visivel que Select dropdown            |
| Colunas           | Checkbox + Nome(avatar+email) + Documento + Tipo badge + Criado em + Trend + Telefone + Actions | Estilo Zenith com dados relevantes do dominio              |
| Formulario        | Pagina dedicada `/clients/new` com breadcrumb e card unico                                      | 10+ campos, UI-PATTERNS.md recomenda pagina para 8+ campos |
| Paginacao         | Visual Zenith sem page numbers (Previous/Next + "Mostrando X-Y de Z" + Rows selector)           | Cursor-based nao suporta page numbers reais                |
| Toolbar           | Search a esquerda + Colunas + Importar + Exportar a direita                                     | Import e feature chave, mantem visivel                     |
| Table engine      | @tanstack/react-table com manualSorting + manualPagination + manualFiltering                    | TanStack como renderizador, backend controla dados         |
| Sort              | Server-side via query params `sortBy` + `sortOrder`                                             | Sorting client-side impossivel com cursor pagination       |
| Column visibility | Client-side via estado local (TanStack gerencia)                                                | Nao precisa de backend                                     |
| Mobile            | Cards responsivos (md:hidden) no padrao Zenith                                                  | Substitui tabela expandivel atual                          |

---

## 2. Estrutura da Pagina `/clients`

```
<main>
  <!-- Breadcrumbs -->
  <Breadcrumb>
    Dashboard > Clientes
  </Breadcrumb>

  <!-- Page Header -->
  <div class="flex justify-between">
    <div>
      <h1>Clientes</h1>
      <p class="text-muted-foreground">Gerencie sua base de clientes e leads.</p>
    </div>
    <Link href="/clients/new">
      <Button>+ Novo Cliente</Button>
    </Link>
  </div>

  <!-- Tab Group Filters -->
  <div class="filter-tabs">
    Todos | Lead | Cliente | Ex-cliente
  </div>

  <!-- Toolbar -->
  <div class="flex justify-between">
    <SearchInput placeholder="Buscar clientes..." />
    <div class="flex gap-2">
      <ColumnsToggle />
      <ImportButton />
      <ExportButton />
    </div>
  </div>

  <!-- Table Desktop (hidden md:block) -->
  <DataTable columns={columns} data={data} />

  <!-- Cards Mobile (md:hidden) -->
  <ClientCards data={data} />

  <!-- Pagination -->
  <Pagination />
</main>
```

---

## 3. Colunas da DataTable

### Column Definitions (@tanstack/react-table)

| #   | ID          | Header                | Cell                                                                | Sortable     | Hideable | Responsive |
| --- | ----------- | --------------------- | ------------------------------------------------------------------- | ------------ | -------- | ---------- |
| 1   | `select`    | Checkbox (select all) | Checkbox (select row)                                               | Nao          | Nao      | Sempre     |
| 2   | `name`      | Nome ↕                | Avatar (iniciais) + nome + email                                    | Sim (server) | Nao      | Sempre     |
| 3   | `document`  | Documento ↕           | CPF/CNPJ formatado                                                  | Sim (server) | Sim      | >= md      |
| 4   | `type`      | Tipo ↕                | Badge colorido (Lead=warning, Cliente=info, Ex-cliente=destructive) | Sim (server) | Sim      | Sempre     |
| 5   | `createdAt` | Criado em ↕           | Data formatada "DD MMM, YYYY"                                       | Sim (server) | Sim      | >= lg      |
| 6   | `trend`     | Trend                 | Sparkline SVG/Recharts (60x24px)                                    | Nao          | Sim      | >= lg      |
| 7   | `phone`     | Telefone              | Telefone formatado                                                  | Nao          | Sim      | >= md      |
| 8   | `actions`   | (vazio)               | DropdownMenu (Ver, Editar, Excluir)                                 | Nao          | Nao      | Sempre     |

### Badge Variants por Tipo

```tsx
const TYPE_BADGE_VARIANTS = {
  LEAD: 'bg-warning text-warning-foreground', // amarelo
  CLIENT: 'bg-primary text-primary-foreground', // preto
  FORMER_CLIENT: 'bg-destructive text-destructive-foreground', // vermelho
}
```

### Avatar com Iniciais

```tsx
<div className="flex items-center gap-3">
  <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
    {getInitials(name)}
  </div>
  <div>
    <div className="font-medium">{name}</div>
    <div className="text-muted-foreground text-xs">{email}</div>
  </div>
</div>
```

### Sort Headers

```tsx
<button
  className="hover:text-foreground inline-flex items-center gap-1"
  onClick={() => handleSort(columnId)}
>
  {label}
  <ArrowUpDown className="size-3.5 opacity-40" />
</button>
```

Ao clicar, atualiza query params `sortBy` e `sortOrder` (asc/desc toggle) e refaz a query ao backend.

---

## 4. Tab Group de Filtros

Custom button group (nao Shadcn Tabs):

```tsx
<div className="bg-muted mb-4 flex w-fit items-center gap-1 rounded-lg p-0.5">
  {filters.map((filter) => (
    <button
      key={filter.value}
      className={cn(
        'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
        active === filter.value
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
      onClick={() => setTypeFilter(filter.value)}
    >
      {filter.label}
    </button>
  ))}
</div>
```

Filtros: `[{ value: null, label: "Todos" }, { value: "LEAD", label: "Lead" }, { value: "CLIENT", label: "Cliente" }, { value: "FORMER_CLIENT", label: "Ex-cliente" }]`

Ao trocar filtro, reseta cursor de paginacao e refaz query.

---

## 5. Toolbar

```tsx
<div className="flex items-center justify-between gap-4">
  {/* Search */}
  <div className="relative">
    <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
    <Input
      placeholder="Buscar clientes..."
      className="h-9 w-full ps-9 md:w-[320px]"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>

  {/* Actions */}
  <div className="flex items-center gap-2">
    <ColumnsDropdown table={table} />
    <ImportButton />
    <ExportButton filters={currentFilters} />
  </div>
</div>
```

### Columns Toggle (DropdownMenu)

Reutiliza o padrao Zenith com `DropdownMenuCheckboxItem` para cada coluna toggleavel. Colunas `select`, `name`, e `actions` nao sao toggleaveis.

---

## 6. @tanstack/react-table — Configuracao

```tsx
const table = useReactTable({
  data: clients,
  columns,
  state: {
    sorting,
    columnVisibility,
    rowSelection,
    pagination: { pageIndex: 0, pageSize },
  },
  onSortingChange: setSorting,
  onColumnVisibilityChange: setColumnVisibility,
  onRowSelectionChange: setRowSelection,
  getCoreRowModel: getCoreRowModel(),
  manualSorting: true,
  manualPagination: true,
  manualFiltering: true,
  rowCount: totalCount,
  enableRowSelection: true,
})
```

**Fluxo de dados:**

1. Estado local: `sorting`, `columnVisibility`, `rowSelection`, `pageSize`, `typeFilter`, `search`
2. Quando `sorting`, `typeFilter`, `search`, ou `pageSize` mudam → refaz query ao backend com params atualizados
3. Backend retorna `{ data: Client[], meta: { total, nextCursor } }`
4. Dados passados para TanStack que renderiza

**Sorting → Backend:**

```tsx
// sorting state: [{ id: "name", desc: false }]
// converte para query params:
const sortBy = sorting[0]?.id // "name"
const sortOrder = sorting[0]?.desc ? 'desc' : 'asc' // "asc"
```

---

## 7. Paginacao

```tsx
<div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
  {/* Info */}
  <span className="text-muted-foreground text-sm">
    Mostrando {from}-{to} de {total} resultados
  </span>

  <div className="flex items-center gap-4">
    {/* Rows per page */}
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">Linhas</span>
      <Select value={pageSize} onValueChange={setPageSize}>
        <SelectTrigger className="h-8 w-16">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[10, 20, 50].map((size) => (
            <SelectItem key={size} value={size}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Navigation */}
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={goBack}
        disabled={!canGoBack}
      >
        Anterior
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={goNext}
        disabled={!nextCursor}
      >
        Proximo
      </Button>
    </div>
  </div>
</div>
```

Cursor logic mantida: array de cursores para navegacao back/forward.

---

## 8. Cards Mobile (< md)

```tsx
<div className="space-y-3 md:hidden">
  {clients.map((client) => (
    <div
      key={client.id}
      className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
      onClick={() => router.push(`/clients/${client.id}`)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar initials={getInitials(client.name)} />
          <span className="font-medium">{client.name}</span>
        </div>
        <ActionsDropdown client={client} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Documento</div>
          <div>{formatDocument(client.document)}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Tipo</div>
          <TypeBadge type={client.type} />
        </div>
        <div>
          <div className="text-muted-foreground text-xs">E-mail</div>
          <div className="truncate">{client.email}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Telefone</div>
          <div>{client.phone}</div>
        </div>
      </div>
    </div>
  ))}
</div>
```

---

## 9. Pagina `/clients/new`

### Rota

Nova pagina: `apps/web/src/app/(dashboard)/clients/new/page.tsx`

### Breadcrumb

```
Dashboard > Clientes (link) > Novo Cliente
```

### Estrutura

```tsx
<main>
  <Breadcrumb>
    Dashboard > Clientes > Novo Cliente
  </Breadcrumb>

  <h1>Novo Cliente</h1>
  <p className="text-muted-foreground">Cadastre um novo cliente ou lead.</p>

  <div className="rounded-lg border p-6 max-w-2xl">
    <h2 className="font-semibold">Dados do Cliente</h2>
    <p className="text-muted-foreground text-sm">
      Preencha as informacoes abaixo para cadastrar.
    </p>

    <ClientForm onSuccess={() => router.push("/clients")} />
  </div>
</main>
```

### Form Fields (card unico, sem tabs)

Todos os campos existentes do `ClientForm` atual, reorganizados em layout vertical:

1. Tipo de Pessoa (PF/PJ) — Select
2. Nome Completo / Razao Social — Input
3. CPF / CNPJ — Input com mascara
4. Tipo (Lead/Cliente/Ex-cliente) — Select
5. E-mail — Input
6. Telefone — Input com mascara
7. Data de Nascimento — DatePicker (PF only)
8. Profissao — Input (PF only)
9. Estado Civil — Select (PF only)
10. Redes Sociais — Instagram, Facebook, LinkedIn, TikTok (colapsavel ou inline)

### Botoes

```tsx
<div className="flex gap-3 pt-4">
  <Button type="submit">Cadastrar Cliente</Button>
  <Button
    type="button"
    variant="outline"
    onClick={() => router.push('/clients')}
  >
    Cancelar
  </Button>
</div>
```

---

## 10. Pagina `/clients/[id]/edit`

Mesma estrutura da pagina `/clients/new`, mas para edicao:

- Breadcrumb: `Dashboard > Clientes > {nome do cliente} > Editar`
- Titulo: "Editar Cliente"
- Descricao: "Atualize as informacoes do cliente."
- Form pre-populado com dados do cliente (usa `useClient(id)` para fetch)
- Botao: "Salvar Alteracoes" em vez de "Cadastrar Cliente"
- O botao "Editar" no dropdown de acoes da tabela e da pagina de detalhe
  navega para `/clients/[id]/edit` em vez de abrir Sheet lateral
- Reutiliza o mesmo `ClientForm` com prop `mode="edit"` e `defaultValues`

---

## 11. Trend Sparkline

Cada cliente recebe um sparkline baseado em atividade recente (propostas, apolices).

**Dados:** Array de 7 pontos representando atividade dos ultimos 7 meses.
**Render:** Recharts `AreaChart` (60x24px) sem eixos, sem tooltip.
**Cor:** Verde se tendencia positiva, vermelho se negativa.

Se o backend ainda nao retorna dados de trend, usar dados mock ou esconder a coluna por padrao (column visibility = false).

---

## 12. Breadcrumb Reutilizavel

Criar componente `PageBreadcrumb` reutilizavel usando Shadcn Breadcrumb:

```tsx
interface BreadcrumbItem {
  label: string
  href?: string // se undefined, e o item atual (nao clicavel)
}

function PageBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <BreadcrumbSeparator>
                <ChevronRight />
              </BreadcrumbSeparator>
            )}
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

Uso: `<PageBreadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Clientes", href: "/clients" }, { label: "Novo Cliente" }]} />`

---

## 13. Mudancas no Backend

### Novos query params no endpoint `GET /v1/clients`

| Param       | Tipo                                            | Default       | Descricao          |
| ----------- | ----------------------------------------------- | ------------- | ------------------ |
| `sortBy`    | `"name" \| "document" \| "type" \| "createdAt"` | `"createdAt"` | Campo de ordenacao |
| `sortOrder` | `"asc" \| "desc"`                               | `"desc"`      | Direcao            |

Os params `search`, `type`, `cursor`, `limit` ja existem.

### Schema update (`_schemas.ts`)

Adicionar `sortBy` e `sortOrder` ao querystring schema do endpoint de listagem.

### Repository update

Mapear `sortBy` para o campo Prisma correspondente e aplicar `orderBy` na query.

---

## 14. Arquivos Afetados

### Novos

| Arquivo                                                            | Descricao                      |
| ------------------------------------------------------------------ | ------------------------------ |
| `apps/web/src/app/(dashboard)/clients/new/page.tsx`                | Pagina de criacao              |
| `apps/web/src/app/(dashboard)/clients/[id]/edit/page.tsx`          | Pagina de edicao               |
| `apps/web/src/components/page-breadcrumb.tsx`                      | Breadcrumb reutilizavel        |
| `apps/web/src/features/clients/components/clients-data-table.tsx`  | Nova DataTable com TanStack    |
| `apps/web/src/features/clients/components/clients-filter-tabs.tsx` | Tab group de filtros           |
| `apps/web/src/features/clients/components/clients-columns.tsx`     | Column definitions do TanStack |
| `apps/web/src/features/clients/components/client-cards.tsx`        | Cards mobile                   |
| `apps/web/src/features/clients/components/client-sparkline.tsx`    | Componente sparkline           |

### Modificados

| Arquivo                                                           | Mudanca                                             |
| ----------------------------------------------------------------- | --------------------------------------------------- |
| `apps/web/src/features/clients/components/clients-table.tsx`      | Reescrever usando TanStack + novos componentes      |
| `apps/web/src/features/clients/components/clients-toolbar.tsx`    | Novo layout (search + columns + import + export)    |
| `apps/web/src/features/clients/components/clients-pagination.tsx` | Visual Zenith com Rows selector                     |
| `apps/web/src/features/clients/components/client-form.tsx`        | Remover Sheet wrapper, usar como form standalone    |
| `apps/web/src/features/clients/components/client-form-fields.tsx` | Ajustar layout para pagina (sem restricao de Sheet) |
| `apps/web/src/features/clients/hooks/use-clients.ts`              | Adicionar sortBy/sortOrder aos params               |
| `apps/web/src/features/clients/lib/constants.ts`                  | Adicionar constantes de column visibility default   |
| `apps/web/src/app/(dashboard)/clients/page.tsx`                   | Adicionar breadcrumb, page header, botao novo       |
| `apps/server/src/routes/v1/clients/_schemas.ts`                   | Adicionar sortBy/sortOrder ao querystring schema    |
| `apps/server/src/routes/v1/clients/list-clients.ts`               | Passar sort params ao use case                      |

### Removidos

| Arquivo                                                           | Razao                                                    |
| ----------------------------------------------------------------- | -------------------------------------------------------- |
| `apps/web/src/features/clients/components/clients-table-rows.tsx` | Substituido por clients-columns.tsx + TanStack rendering |
| `apps/web/src/features/clients/components/client-row.tsx`         | Substituido por TanStack row rendering                   |

---

## 15. Dependencias

### Novas dependencias npm

```bash
pnpm --filter @app/web add @tanstack/react-table recharts
```

`@tanstack/react-table` pode ja estar instalado (verificar). `recharts` e necessario para sparklines.

### Componentes Shadcn necessarios

Verificar se ja existem, adicionar se ausentes:

```bash
pnpm dlx shadcn@latest add breadcrumb checkbox
```

`table`, `button`, `badge`, `input`, `select`, `dropdown-menu`, `label` ja devem existir.

---

## 16. Fora de Escopo

- Redesign de outras tabelas (policies, proposals, commissions) — sera feito depois usando o mesmo padrao
- Implementacao real do trend/sparkline com dados do backend — usar mock por enquanto
- Acoes em lote (bulk actions com checkbox) — checkbox adicionado para futuro, sem floating bar por agora
- Dark mode — manter suporte existente via tokens semanticos
- Command Palette (Cmd+K) — feature separada do Zenith, nao inclusa neste redesign
