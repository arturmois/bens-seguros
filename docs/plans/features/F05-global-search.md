# F05. Busca Global (Command Palette)

> **Esforco:** M (3-5 dias) | **Impacto:** Retencao + Diferenciacao | **Prioridade:** Mes 3

---

## Descricao

`Cmd+K` / `Ctrl+K` para buscar across clients, proposals, policies, claims. Power users chegam rapido ao que procuram.

## Por Que

Corretora com 500+ clientes perde tempo navegando entre modulos. Command palette e padrao moderno (Linear, Notion, Vercel).

## Problema que Resolve

Navegacao entre modulos para encontrar informacao. Fluxo atual: abrir modulo → filtrar → encontrar.

## Implementacao

### Etapa 1: Backend — Endpoint de Busca Unificada

```typescript
// apps/server/src/routes/v1/search-routes.ts
// GET /api/v1/search?q=joao&limit=10

interface SearchResult {
  type: 'client' | 'proposal' | 'policy' | 'claim' | 'commission'
  id: string
  title: string
  subtitle: string
  url: string
}

// Buscar em paralelo:
const [clients, proposals, policies, claims] = await Promise.all([
  prisma.client.findMany({
    where: {
      organizationId,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { documentHash: hashIfDocument(query) },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 5,
  }),
  prisma.proposal.findMany({ ... }),
  prisma.policy.findMany({ ... }),
  prisma.claim.findMany({ ... }),
])
```

### Etapa 2: Frontend — Command Palette

```bash
pnpm add cmdk -F web
```

```typescript
// components/global/command-palette.tsx
import { Command } from 'cmdk'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { data: results } = useSearch(query)

  // Cmd+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input
        placeholder="Buscar clientes, propostas, apolices..."
        value={query}
        onValueChange={setQuery}
      />
      <Command.List>
        <Command.Group heading="Clientes">
          {results?.clients.map((c) => (
            <Command.Item onSelect={() => router.push(`/clients/${c.id}`)}>
              {c.name} — {c.document}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Propostas">...</Command.Group>
        <Command.Group heading="Apolices">...</Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
```

### Etapa 3: Debounce + Cache

```typescript
// hooks/use-search.ts
export function useSearch(query: string) {
  const debouncedQuery = useDebounce(query, 300)

  return useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.get(`/api/v1/search?q=${debouncedQuery}`),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  })
}
```

### Etapa 4: Navegacao Rapida

Alem de busca, incluir atalhos de navegacao:

- "Novo cliente" → `/clients/new`
- "Nova proposta" → `/proposals/new`
- "Dashboard" → `/dashboard`
- "Configuracoes" → `/settings`

## Criterios de Aceite

- [ ] `Cmd+K` / `Ctrl+K` abre command palette
- [ ] Busca em clientes, propostas, apolices, sinistros
- [ ] Debounce 300ms
- [ ] Resultados agrupados por tipo
- [ ] Click navega para detalhe
- [ ] Atalhos de navegacao rapida
- [ ] Busca por CPF funciona (via hash)
- [ ] Responsivo (modal full-width em mobile)
