# F08 Sub-projeto 2 — Ranking de Corretores + Export PDF Dashboard

## Objetivo

Adicionar widget de ranking de corretores ao dashboard e botao "Exportar PDF" que gera um relatorio gerencial com KPIs, metricas financeiras e ranking.

## Decisoes de Design

- **Ranking:** Tabela com 3 metricas por corretor (propostas emitidas, premio total, ticket medio), ordenada por premio desc
- **Export PDF:** Relatorio estruturado via @react-pdf/renderer (mesmo pattern do F03), nao screenshot
- **Periodo:** Ranking e PDF respeitam o preset selecionado (7d/30d/90d/6m)
- **RBAC:** Ranking visivel para OWNER/ADMIN/MANAGER

## Ranking de Corretores

### Backend

Novo campo `ranking` na response de `GET /api/v1/stats/dashboard?preset=30d`:

```typescript
ranking: Array<{
  salespersonId: string
  salespersonName: string
  policiesIssued: number
  totalPremiumCents: number
  averageTicketCents: number
}>
```

Query: `GROUP BY salespersonId` em policies criadas no periodo, com JOIN em members para nome. Ordenado por `totalPremiumCents` desc. Limite: top 10.

### Frontend

Novo componente `broker-ranking.tsx` — tabela compacta com 4 colunas:

| Corretor     | Emitidas | Premio Total | Ticket Medio |
| ------------ | -------- | ------------ | ------------ |
| Maria Santos | 5        | R$ 45.000    | R$ 9.000     |
| Joao Silva   | 3        | R$ 28.000    | R$ 9.333     |

- Posicao: entre os charts (propostas/comissoes) e o trend chart
- Empty state: "Nenhuma apolice emitida no periodo"
- Skeleton loading
- Visivel apenas para roles OWNER, ADMIN, MANAGER (verificar via `activeOrg.role`)

## Export PDF do Dashboard

### Backend

Novo endpoint: `POST /api/v1/stats/dashboard/pdf?preset=30d`

- RBAC: `requireAbility('read', 'Client')` (mesmo do stats endpoint)
- Busca os mesmos dados de `/stats/dashboard` (reutiliza `buildDashboardData`)
- Renderiza template @react-pdf/renderer
- Upload ao R2 via StorageProvider
- Retorna signed URL

### Template PDF

Estilo formal (mesmo do F03):

```
+----------------------------------+
| [Logo] CORRETORA ABC SEGUROS    |
| RELATORIO GERENCIAL             |
| Periodo: 01/03 - 26/03/2026    |
+----------------------------------+
| INDICADORES PRINCIPAIS          |
| Propostas: 12  (+20%)           |
| Apolices: 8    (+14%)           |
| Sinistros: 3   (-50%)           |
| Comissoes: R$ 4.500 (+30%)     |
+----------------------------------+
| METRICAS FINANCEIRAS            |
| Premio Total: R$ 45.000 (+12%) |
| Ticket Medio: R$ 5.625 (+5%)  |
| Comissoes a Receber: R$ 2.800  |
+----------------------------------+
| RANKING DE CORRETORES           |
| # | Corretor | Emitidas | Premio|
| 1 | Maria    | 5        | 45k   |
| 2 | Joao     | 3        | 28k   |
+----------------------------------+
| Gerado em: 26/03/2026          |
| Por: QA Tester                  |
+----------------------------------+
```

### Frontend

Botao "Exportar PDF" no header do dashboard, ao lado dos presets.

- Icone `Download` do lucide-react
- Loading state durante geracao
- Abre PDF em nova aba (mesmo pattern do F03)
- Hook: `use-export-dashboard-pdf.ts`

## Arquivos

### Backend

- Modify: `apps/server/src/routes/v1/stats-helpers.ts` — adicionar ranking query
- Modify: `apps/server/src/routes/v1/stats-routes.ts` — adicionar POST /dashboard/pdf
- Create: `apps/server/src/pdf-templates/dashboard-report-pdf.tsx` — template do relatorio

### Frontend

- Create: `apps/web/src/features/dashboard/components/broker-ranking.tsx`
- Create: `apps/web/src/features/dashboard/hooks/use-export-dashboard-pdf.ts`
- Modify: `apps/web/src/features/dashboard/components/dashboard-content.tsx` — adicionar ranking + botao export
- Modify: `apps/web/src/features/dashboard/types/index.ts` — adicionar RankingEntry type

## Fora do Escopo

- Tempo medio por estagio (feature separada se necessario)
- Churn de apolices (feature separada)
- Drill-down ao clicar no ranking (navegar para propostas do corretor)

## Criterios de Aceite

- [ ] Ranking de corretores com 3 metricas (emitidas, premio, ticket medio)
- [ ] Ranking ordenado por premio total desc, top 10
- [ ] Ranking respeita preset selecionado
- [ ] Ranking visivel apenas para OWNER/ADMIN/MANAGER
- [ ] Botao "Exportar PDF" no header do dashboard
- [ ] PDF com KPIs + comparativos + metricas financeiras + ranking
- [ ] PDF salvo no R2, retorna signed URL
- [ ] Loading states (skeleton ranking, spinner botao export)
- [ ] Empty state no ranking quando sem dados
- [ ] `pnpm test`, `pnpm lint`, `pnpm build` passam
