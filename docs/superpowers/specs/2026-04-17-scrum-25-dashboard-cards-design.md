# SCRUM-25 — Dashboard com novos cards de acompanhamento (Fase 1)

- **Jira:** https://arturmoiscontato.atlassian.net/browse/SCRUM-25
- **Data:** 2026-04-17
- **Escopo:** Fase 1 de 3 (ver "Fora do escopo" abaixo)

## Contexto

O dashboard atual já tem 5 stats cards (Propostas ativas, Apólices ativas, Sinistros abertos, Comissões pendentes, Renovações em 7 dias), gráficos (Propostas por estágio, Comissões, Conversão, Sinistros por prioridade), AlertsWidget e BrokerRanking. A descrição do ticket estava desatualizada (mencionava só 4 cards originais).

SCRUM-25 pede **6 novos cards de acompanhamento comercial e operacional**. Dois deles (Metas e Funil de Leads) têm complexidade alta o bastante para virarem features próprias, então o escopo foi **decomposto em 3 fases**:

- **Fase 1 (este spec):** 4 cards simples + reordenação + deep-link.
- **Fase 2 (ticket novo):** card de **Metas** (requer modelo `Goal` no Prisma, CRUD, permissões MANAGER+).
- **Fase 3 (ticket novo):** card de **Funil de Leads** (requer design de mapeamento de pipeline).

## Problema

Gestores, corretores e operadores acessam múltiplas telas para obter indicadores-chave de desempenho comercial e pendências operacionais (quantas vendas novas no mês, quantas propostas pararam, quantos sinistros + assistências em aberto). O dashboard atual não consolida essa visão acionável.

## Solução

Reestruturar o grid de stats cards do dashboard para **6 cards consolidados**, ordenados por fluxo comercial → operacional → financeiro, com **deep-link** de cada card/chip para a lista correspondente filtrada.

### Cards finais (na ordem)

| #   | Card                             | Valor primário                                             | Detalhe secundário                                           | Clique                                                                            |
| --- | -------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 1   | **Seguro Novo**                  | Count de apólices novas emitidas no período                | Badge de variação % vs período anterior                      | `/policies?boardType=NEW_INSURANCE&from=<isoDate>` (frontend converte preset→ISO) |
| 2   | **Renovação 7d**                 | Count de apólices ativas com `endDate` nos próximos 7 dias | `R$ X em prêmio` (soma de `premiumValueInCents`)             | `/policies?filter=expiring-7d`                                                    |
| 3   | **Propostas Pendentes**          | Total em stages não-terminais                              | 3 chips coloridos (em dia 0-3d · atenção 3-7d · crítico +7d) | Cada chip → `/proposals?stage=...&updatedAtFrom/To=...`                           |
| 4   | **Avisos**                       | Total (sinistros abertos + assistências abertas)           | `X sinistros · Y assistências` (cada um link)                | sinistros → `/claims?status=open` · assistências → `/assistances?status=open`     |
| 5   | **Apólices ativas** (mantém)     | Count de apólices `status=ACTIVE`                          | Badge de variação %                                          | `/policies?status=ACTIVE`                                                         |
| 6   | **Comissões pendentes** (mantém) | `R$ X` somados em status `PENDING_*`                       | Badge de variação %                                          | `/commissions?filter=pending`                                                     |

**Cards removidos:** "Propostas ativas" (absorvido por Propostas Pendentes, que agora tem segmentação) e "Sinistros abertos" (absorvido pela primeira linha de Avisos).

### Definições precisas

- **Seguro Novo (current):** `Policy.count` onde `Proposal.boardType = NEW_INSURANCE`, `Policy.createdAt ∈ [rangeFrom, now]`, `Policy.deletedAt IS NULL`. Comparativo = mesma query no período anterior (tamanho igual, janela anterior).
- **Renovação 7d prêmio:** `Policy.aggregate._sum.premiumValueInCents` onde `status=ACTIVE`, `endDate ∈ [now, now+7d]`, `deletedAt IS NULL`. Count = `renewalsNext7Days` (já existe).
- **Avisos:**
  - `claimsOpen` = `Claim.count` onde `status ∉ {COMPLETED, REJECTED}` e `deletedAt IS NULL`.
  - `assistancesOpen` = `Assistance.count` onde `status ≠ COMPLETED` (as 5 demais: REQUESTED, AWAITING_DOCUMENT, PENDING_INSPECTION, DISPATCHED, IN_PROGRESS).
  - `total` = `claimsOpen + assistancesOpen`.
- **Propostas Pendentes:**
  - Filtro base: `Proposal.stage ∈ {CAPTURE, QUOTE, PROTOCOL, INSPECTION, PAYMENT}`, `deletedAt IS NULL`.
  - Buckets por `updatedAt`:
    - `inDay` = `updatedAt >= now - 3d`
    - `warning` = `updatedAt < now - 3d AND updatedAt >= now - 7d`
    - `critical` = `updatedAt < now - 7d`
  - `total = inDay + warning + critical`

### Padrão visual

- **Chips coloridos** em "Propostas Pendentes" usando tokens semânticos (`success`, `warning`, `destructive` do `@coss/style`). Cada chip é um `<Link>` do Next.
- **Breakdown textual** em "Avisos": duas linhas clicáveis, ícone + label + count.
- Ordem visual em grid responsiva: `grid-cols-1` (mobile) → `md:grid-cols-2` → `xl:grid-cols-3` (2 linhas de 3).
- Cards mantêm altura uniforme (flex col, conteúdo secundário em `mt-auto`).

### AlertsWidget

Renomear o `CardTitle` do `AlertsWidget` para "Itens que precisam de atenção" — apenas o texto visível. **Manter filename `alerts-widget.tsx` e nome do componente** (evitar churn; filename fica inconsistente com título por enquanto, aceitável). Lógica inalterada. Justificativa: evitar confusão com o novo card "Avisos" (que conta o total aberto), enquanto o Widget destaca o que está **estagnado/esquecido** (sinistros sem atualização, comissões pendentes >7d, propostas estagnadas, apólices vencendo).

## Arquitetura

### Backend

**Endpoint único estendido** (sem versionamento novo): `GET /api/v1/stats/dashboard` acumula os novos campos. Justificativa: o endpoint já é "kitchen sink" do dashboard (~20 queries em `Promise.all`), cache Redis 60s comum. YAGNI para v2 até existir cliente mobile real.

**Novos campos no response schema** (`apps/server/src/routes/v1/stats/_schemas.ts`):

```ts
newInsurance: metricComparisonSchema,
renewal7dPremiumCents: z.number(),
warnings: z.object({
  total: z.number(),
  claimsOpen: z.number(),
  assistancesOpen: z.number(),
}),
proposalsPending: z.object({
  total: z.number(),
  inDay: z.number(),
  warning: z.number(),
  critical: z.number(),
}),
```

**Novas funções em `stats-helpers.ts`** (paralelizadas dentro do `Promise.all` existente):

- `fetchNewInsuranceStats(orgId, ranges, db)` → `{ current, previous, changePercent }`.
- `fetchRenewal7dPremium(orgId, ranges, db)` → `number` (cents).
- `fetchWarnings(orgId, db)` → `{ total, claimsOpen, assistancesOpen }`.
- `fetchProposalsPendingByBucket(orgId, db)` → `{ total, inDay, warning, critical }`.

**Nota sobre `prismaAdmin`:** o arquivo atual usa `prismaAdmin` (superuser que bypassa RLS) e filtra `organizationId` manualmente em cada query — padrão documentado em `CLAUDE.md` (seção Database) por causa do connection-pool-timeout com tenantPrisma em `Promise.all`. Manter o padrão.

### Banco

**Nenhum modelo novo.** Um índice novo:

```prisma
model Proposal {
  // ...
  @@index([organizationId, stage, updatedAt(sort: Desc)])
}
```

Migration: `pnpm --filter @repo/db exec prisma migrate dev --name add_proposal_stage_updated_at_index`.

Justificativa: os buckets de idade filtram por `stage IN (...)` + range de `updatedAt` — sem índice composto, scan full table em orgs grandes.

### Frontend

**Componentes afetados:**

- `apps/web/src/features/dashboard/components/stats-cards.tsx` — reescrito: 6 cards, grid `md:grid-cols-2 xl:grid-cols-3`.
- `apps/web/src/features/dashboard/components/cards/` — **novo diretório** com 6 sub-componentes:
  - `new-insurance-card.tsx` (count + `ComparisonBadge`)
  - `renewal-7d-card.tsx` (count + "R$ X em prêmio")
  - `proposals-pending-card.tsx` (count + 3 chips `<Link>`)
  - `warnings-card.tsx` (count + 2 linhas `<Link>`)
  - `active-policies-card.tsx` (extrai do atual)
  - `pending-commissions-card.tsx` (extrai do atual)
- `apps/web/src/features/dashboard/components/alerts-widget.tsx` — rename do `CardTitle` apenas.

**Tipos:** regenerados via `pnpm --filter @app/web generate:api` após o backend publicar o novo OpenAPI schema. Zod schemas gerados pelo Orval são fonte de verdade para validação cliente.

**Reuso:**

- `ComparisonStatCard` continua sendo o bloco base (Seguro Novo, Apólices ativas, Comissões pendentes).
- `formatCurrency` de `@/lib/formatters` para prêmios.
- Tokens `@coss/style` + `Badge` do shadcn/ui para chips.

**Acessibilidade:**

- Cada chip/link tem `aria-label` explícito ("12 propostas em dia, ver lista").
- Tab order segue a ordem visual.
- Chips mantêm contraste AA em dark mode (`success`/`warning`/`destructive` com `-foreground` apropriado).

**Estados (4 obrigatórios):** `DashboardContent` já trata Loading/Error/Success. Empty: cards mostram `0` com micro-mensagem quando relevante (ex: "Nenhum seguro novo no período").

### Deep-link — filtros nas listas

| Página         | Query params aceitos (novos)                                                                                                                                                        | Mudança no backend                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/policies`    | `boardType` (NEW_INSURANCE/RENEWAL/ENDORSEMENT — vive em `Proposal.boardType`, exige relation filter), `from` (ISO date → `createdAt gte`), `filter=expiring-7d`, `status` (ACTIVE) | `list-policies`: aceita `boardType` via Prisma relation filter (`where: { proposal: { boardType } }`), `from` (createdAt gte), mantém shortcut `filter=expiring-7d` |
| `/proposals`   | `stage` (CSV), `updatedAtFrom`, `updatedAtTo`                                                                                                                                       | `list-proposals`: aceita CSV de `stage`, ranges de `updatedAt`                                                                                                      |
| `/claims`      | `status=open` (shortcut)                                                                                                                                                            | `list-claims`: mapeia `open` → `status: { notIn: ['COMPLETED', 'REJECTED'] }`                                                                                       |
| `/assistances` | `status=open` (shortcut)                                                                                                                                                            | `list-assistances`: mapeia `open` → `status: { not: 'COMPLETED' }`                                                                                                  |
| `/commissions` | `filter=pending` (existe)                                                                                                                                                           | nenhuma                                                                                                                                                             |

**Back-compat:** todos os parâmetros são opcionais. URLs antigas continuam funcionando.

**Primeira tarefa da implementação:** validar o estado real de cada filtro nas páginas atuais (alguns podem já funcionar). Não assumir.

## Testes

### Unit (Vitest)

- `stats-helpers.spec.ts`: 4 funções novas com Prisma mockado, cobrindo zerados, bordas dos buckets (exatamente 3d/7d), comparativo com `previous=0`.
- `list-proposals.spec.ts`: filtro `updatedAtFrom/To` — range válido, ISO inválido rejeitado.
- `list-claims.spec.ts`, `list-assistances.spec.ts`, `list-policies.spec.ts`: shortcut `status=open`, `boardType`, `from`.
- Frontend: 4 specs novos (um por card novo) validando render, aria, e `href` dos links com params corretos.

### Integration (Vitest + DB real)

- `apps/server/src/routes/v1/stats/__tests__/dashboard-stats.int.spec.ts`:
  - Isolamento tenant (2 orgs, stats não vazam).
  - Seeds de apólices com `boardType=NEW_INSURANCE` e `RENEWAL` → valida `newInsurance.current`.
  - Seeds de propostas com `updatedAt` em 1d, 5d, 10d atrás → valida buckets.
  - Seeds de sinistros em todos os status → valida só "abertos" contam.

### Manual QA (Playwright MCP)

- Dashboard renderiza 6 cards na ordem (desktop 1440px + mobile 375px).
- Loading → Success sem flicker.
- Clique em cada card/chip → URL correta → lista filtrada com contagem equivalente.
- Dark mode: contraste AA nos chips.
- AlertsWidget continua funcionando com novo título (regressão).
- Screenshots em `audit/scrum-25/` anexados ao PR.

## Observabilidade

Cache Redis 60s por chave `dashboard:stats:{orgId}:{preset}` permanece. Adicionar métrica Pino no endpoint: log `duration_ms` a cada request (já é padrão do Fastify). Alerta informal se p95 passar de 500ms — adicionar investigação como tarefa de polish no plano.

## Riscos e mitigações

| Risco                                                       | Mitigação                                                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Nova query de bucket cai performance em orgs grandes        | Índice composto `(orgId, stage, updatedAt DESC)` (incluído). Monitorar p95 no primeiro deploy. |
| Filtros nas listas já existem parcialmente e viram confusão | Primeira tarefa da implementação = auditar estado atual de cada lista (plano detalhará).       |
| Frontend types desatualizados (Orval)                       | Regenerar após backend merged, validar via `pnpm typecheck`.                                   |
| Usuário clica e lista não bate com card (count divergente)  | Integration tests validando a paridade; manual QA obrigatório.                                 |

## Critérios de aceitação

1. Dashboard exibe os 6 cards na ordem: Seguro Novo → Renovação 7d → Propostas Pendentes → Avisos → Apólices ativas → Comissões pendentes.
2. Cada novo card mostra dados corretos (validado por integration test + QA manual).
3. Clique em cada card/chip navega para lista com filtro aplicado e contagem coerente.
4. Filtros novos de lista retornam dados coerentes com o card de origem.
5. Dark mode + responsividade (375px / 1440px) aprovados no QA Playwright.
6. 5 quality gates verdes (lint, typecheck, build, test, code review).
7. Nenhuma regressão em `AlertsWidget`, `BrokerRanking`, gráficos, ou outros cards mantidos.

## Fora do escopo (para tickets futuros)

- **Card de Metas** (renovação + seguro novo): requer modelo `Goal` no Prisma (organizationId, targetType, targetValue, month, year, setBy), CRUD com permissões MANAGER+, tela de configuração, seed, relação com permissões CASL. Ticket separado a ser criado.
- **Card de Funil de Leads:** requer decisões de mapeamento (os estágios do ticket "contato inicial / proposta enviada / negociação / fechado" não mapeiam 1:1 no `ProposalStage` atual) e possivelmente um componente de pipeline visualization. Ticket separado.
- **Período granular "dia/semana/mês":** ticket menciona granularidade, mas o dashboard já tem presets (7d/30d/90d/6m) suficientes para Fase 1. Ajuste pode virar polish futuro.
- **Drill-down modal:** clicar no card abre modal em vez de navegar. Fora do escopo.

## Referências

- `CLAUDE.md` — regras de DDD, naming, testes.
- `docs/UI-PATTERNS.md` — padrões visuais (tokens, chips).
- `docs/FRONTEND-PATTERNS.md` — Orval, React Query, feature structure.
- `apps/server/src/routes/v1/stats/stats-helpers.ts` — padrão atual de agregação.
- `apps/web/src/features/dashboard/components/stats-cards.tsx` — componente a reescrever.
