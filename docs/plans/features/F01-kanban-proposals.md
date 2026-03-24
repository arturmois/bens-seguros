# F01. Kanban Visual de Propostas

> **Esforco:** M (3-5 dias) | **Impacto:** Diferenciacao + Retencao | **Prioridade:** Mes 2

---

## Descricao

Board drag & drop para gerenciar propostas por estagio: CAPTURA → COTACAO → PROTOCOLO → VISTORIA → PAGAMENTO → EMISSAO | PERDIDA.

## Por Que

O fluxo de propostas e o coracao do negocio de corretagem. A tabela atual e funcional mas o Kanban da visibilidade instantanea do pipeline e gargalos. Gestor ve em 1 segundo onde estao as propostas.

## Problema que Resolve

- Gestor nao tem visao panoramica do pipeline comercial
- Cada proposta precisa ser aberta individualmente para ver estagio
- Sem identificacao visual de gargalos (muitas propostas em VISTORIA = problema)

## Stack Tecnica

- `@dnd-kit/core` + `@dnd-kit/sortable` (ja listado na spec)
- TanStack React Query (dados ja existem via `useProposals`)
- API: `PATCH /api/v1/proposals/:id/stage` (ja existe)

## Implementacao

### Etapa 1: Componentes do Board

```
features/proposals/components/
  proposal-kanban/
    kanban-board.tsx        (~150 linhas — layout das colunas)
    kanban-column.tsx       (~100 linhas — coluna com cards)
    kanban-card.tsx         (~80 linhas — card de proposta)
    kanban-empty-column.tsx (~30 linhas — estado vazio)
```

### Etapa 2: Logica de Drag & Drop

```typescript
// kanban-board.tsx
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'

function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event
  if (!over) return

  const proposalId = active.id as string
  const newStage = over.id as ProposalStage

  // Validar transicao (LOST nao pode avancar)
  if (!isValidTransition(currentStage, newStage)) {
    toast.error('Transicao invalida')
    return
  }

  // Mutation otimista
  advanceStage.mutate({ proposalId, stage: newStage })
}
```

### Etapa 3: Toggle Table/Kanban

```typescript
// proposals page
const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban')

return (
  <>
    <ViewToggle value={viewMode} onChange={setViewMode} />
    {viewMode === 'table' ? <ProposalsTable /> : <KanbanBoard />}
  </>
)
```

### Etapa 4: Responsividade

- Desktop: 7 colunas horizontais com scroll
- Tablet: 4 colunas visiveis com scroll horizontal
- Mobile: 1 coluna com selector de estagio (nao drag)

## Dados Necessarios

Endpoint `GET /api/v1/proposals` ja retorna `stage` — agrupar client-side por estagio.
Para performance com muitas propostas, considerar endpoint dedicado `GET /api/v1/proposals/board` que retorna contagem por estagio + top N cards.

## Criterios de Aceite

- [ ] Board com 7 colunas (uma por estagio)
- [ ] Drag & drop muda estagio via API
- [ ] Validacao de transicoes invalidas (LOST nao avanca)
- [ ] Card mostra: cliente, ramo, valor, dias no estagio
- [ ] Toggle entre Tabela e Kanban
- [ ] Responsivo (mobile: selector, desktop: drag)
- [ ] 4 estados UI (empty, loading, error, success)
- [ ] Mutation otimista com rollback em erro
