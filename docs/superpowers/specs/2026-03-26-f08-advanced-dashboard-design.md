# F08 Sub-projeto 1 — Dashboard Filtros + Metricas Comparativas

## Objetivo

Adicionar filtros por periodo (presets) ao dashboard, transformar os 4 KPIs existentes em cards comparativos (% vs periodo anterior), e incluir 3 novas metricas financeiras: premio total emitido, ticket medio, e comissoes a receber.

## Decisoes de Design

- **Presets apenas** — botoes 7d, 30d, 90d, 6m. Sem date picker customizado. Default: 30d.
- **Comparativos nos KPIs existentes** — valor atual + variacao % verde/vermelho vs periodo anterior
- **3 metricas novas** — premio total emitido, ticket medio, comissoes a receber (aprovadas nao pagas)
- **Endpoint unico** — expandir `/stats/dashboard` existente com `?preset=30d`
- **Tema adaptativo** — usar CSS variables do @coss/style, funciona em light e dark mode

## Fora do escopo (Sub-projeto 2)

- Ranking de corretores
- Tempo medio por estagio
- Export PDF do dashboard
- Churn de apolices

## Backend

### Endpoint

`GET /api/v1/stats/dashboard?preset=30d`

Presets validos: `7d`, `30d`, `90d`, `6m`. Default: `30d`.

O backend calcula dois periodos a partir do preset:

- **Atual:** hoje - N dias ate hoje
- **Anterior:** hoje - 2N dias ate hoje - N dias

Validacao: Zod schema para o query param `preset`.

### Response

```typescript
interface DashboardStatsResponse {
  // Existentes (agora filtrados por periodo)
  proposalsByStage: Array<{ stage: string; count: number }>
  activePolicies: number
  claimsByPriority: Array<{ priority: string; count: number }>
  commissionsThisMonth: Array<{
    status: string
    count: number
    totalCents: number
  }>
  conversionRate: { total: number; issued: number; rate: number }
  monthlyTrends: Array<{ month: string; proposals: number; issued: number }>

  // Novos — comparativos dos 4 KPIs
  comparison: {
    proposals: ComparisonMetric
    policies: ComparisonMetric
    claims: ComparisonMetric
    commissionsPending: ComparisonMetric
  }

  // Novos — 3 metricas financeiras
  totalPremium: ComparisonMetric
  averageTicket: ComparisonMetric
  commissionsReceivable: number
}

interface ComparisonMetric {
  current: number
  previous: number
  changePercent: number // positivo = cresceu, negativo = caiu
}
```

### Queries novas

- **Propostas (comparativo):** `COUNT(proposals) WHERE createdAt BETWEEN from AND to` para cada periodo
- **Apolices (comparativo):** `COUNT(policies) WHERE createdAt BETWEEN from AND to`
- **Sinistros (comparativo):** `COUNT(claims) WHERE createdAt BETWEEN from AND to`
- **Comissoes pendentes (comparativo):** `SUM(commissionValueInCents) WHERE status IN (PENDING_COMMERCIAL, PENDING_ADMIN) AND createdAt BETWEEN from AND to`
- **Premio total emitido:** `SUM(premiumValueInCents) WHERE policies.createdAt BETWEEN from AND to`
- **Ticket medio:** premio total / quantidade de apolices no periodo
- **Comissoes a receber:** `SUM(commissionValueInCents) WHERE status = 'APPROVED' AND paidAt IS NULL`

## Frontend

### Layout

```
+-----------------------------------------------+
| Dashboard                    [7d] [30d] [90d] [6m] |
+-----------------------------------------------+
| Propostas  | Apolices   | Sinistros | Comissoes |
| 12         | 8          | 3         | R$ 4.500  |
| +20% ▲     | +14% ▲     | -50% ▼    | +30% ▲    |
+-----------------------------------------------+
| Premio Total   | Ticket Medio  | Comissoes a   |
| R$ 45.000      | R$ 5.625      | Receber       |
| +12% ▲         | +5% ▲         | R$ 2.800      |
+-----------------------------------------------+
| [Propostas por Estagio] | [Comissoes do Mes]  |
+-----------------------------------------------+
| [Conversao] | [Sinistros] | [Alertas]         |
+-----------------------------------------------+
| [Tendencia (6 meses)]                         |
+-----------------------------------------------+
```

### Componentes novos

- `dashboard-period-filter.tsx` (~50 linhas) — barra de botoes de preset, estado controlado via query param ou state
- `comparison-stat-card.tsx` (~60 linhas) — card KPI generico com titulo, valor, variacao % (verde/vermelho), seta up/down
- `financial-metrics.tsx` (~40 linhas) — fileira de 3 ComparisonStatCards para premio, ticket, comissoes a receber

### Componentes modificados

- `dashboard-content.tsx` — adicionar PeriodFilter no topo, passar preset ao hook, renderizar fileira de metricas financeiras
- `stats-cards.tsx` (ou equivalente) — refatorar para usar ComparisonStatCard com dados de comparativo
- `use-dashboard-stats.ts` (hook) — aceitar `preset` como parametro, incluir na query key para invalidacao automatica

### Comportamento

- Ao clicar num preset, o hook refetch com o novo periodo
- Loading state: skeleton nos cards durante refetch
- Charts existentes recebem dados ja filtrados — sem mudanca nos componentes de chart
- Alerts widget nao e filtrado por periodo (alertas sao always-on)

## Criterios de Aceite

- [ ] Barra de presets (7d, 30d, 90d, 6m) no topo do dashboard
- [ ] 4 KPIs existentes com variacao % vs periodo anterior (verde positivo, vermelho negativo)
- [ ] 3 novos cards: premio total emitido, ticket medio, comissoes a receber
- [ ] Variacao % calculada corretamente (current vs previous period)
- [ ] Charts filtrados pelo periodo selecionado
- [ ] Loading state (skeleton) ao trocar periodo
- [ ] Funciona em light mode e dark mode
- [ ] Endpoint retorna dados corretos para cada preset
- [ ] `pnpm test`, `pnpm lint`, `pnpm build` passam
