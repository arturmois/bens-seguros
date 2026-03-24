# F08. Dashboard Avancado com Analytics

> **Esforco:** M-G (1-3 semanas) | **Impacto:** Retencao + Receita (upsell premium) | **Prioridade:** Mes 3

---

## Descricao

Drill-down por periodo, comparativo mensal, metas de conversao, ranking de corretores, LTV de clientes.

## Por Que

Dashboard atual mostra snapshot. Gestor precisa de tendencias e comparativos para tomar decisoes.

## Problema que Resolve

Gestao baseada em intuicao em vez de dados. Sem historico de performance.

## Implementacao

### Etapa 1: Filtros de Periodo

```typescript
// Toolbar do dashboard
<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  presets={[
    { label: 'Hoje', range: [today, today] },
    { label: 'Esta semana', range: [startOfWeek, today] },
    { label: 'Este mes', range: [startOfMonth, today] },
    { label: 'Mes passado', range: [startOfLastMonth, endOfLastMonth] },
    { label: 'Ultimos 90 dias', range: [sub90, today] },
  ]}
/>
```

### Etapa 2: Metricas Adicionais

| Metrica                 | Calculo                                 | Visualizacao |
| ----------------------- | --------------------------------------- | ------------ |
| Taxa de conversao       | Propostas EMITIDAS / Total propostas    | % com trend  |
| Tempo medio por estagio | Avg dias em cada estagio                | Bar chart    |
| Ranking de corretores   | Propostas emitidas por comercial        | Leaderboard  |
| Premio total emitido    | Sum premio de apolices no periodo       | KPI card     |
| Ticket medio            | Premio total / Qtd apolices             | KPI card     |
| Churn de apolices       | Apolices nao renovadas / Total vencidas | % com trend  |
| Comissoes a receber     | Sum comissoes APPROVED nao pagas        | KPI card     |

### Etapa 3: Comparativo Mensal

```typescript
// Grafico de barras agrupadas: mes atual vs mes anterior
// Para cada metrica: valor atual, valor anterior, variacao %

<ComparisonCard
  title="Propostas Emitidas"
  current={42}
  previous={35}
  trend="+20%"
/>
```

### Etapa 4: Backend — Endpoints de Stats

```typescript
// GET /api/v1/stats/dashboard?from=2026-01-01&to=2026-03-24
// GET /api/v1/stats/conversion?from=...&to=...
// GET /api/v1/stats/ranking?from=...&to=...
// GET /api/v1/stats/trends?months=6

// Queries otimizadas com GROUP BY + indexes
// Cache Redis: 5 min TTL para stats pesados
```

### Etapa 5: Export de Relatorio

Botao "Exportar PDF" no dashboard com snapshot visual das metricas.

## Criterios de Aceite

- [ ] Filtro de periodo funcional (presets + custom range)
- [ ] 7+ metricas novas alem do dashboard atual
- [ ] Comparativo mes atual vs anterior
- [ ] Ranking de corretores
- [ ] Graficos de tendencia (6 meses)
- [ ] Cache Redis para queries pesadas
- [ ] Responsivo em mobile (cards empilhados)
