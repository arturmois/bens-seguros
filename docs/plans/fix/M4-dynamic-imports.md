# M4. Dynamic Imports em Componentes Pesados

> **Severidade:** MEDIO (performance) | **Esforco:** P (1h) | **Prioridade:** Semana 1 | Quick Win

---

## Problema

Componentes pesados importados estaticamente aumentam bundle size e TTI.

## Componentes Alvo

1. **Recharts** (charts do dashboard) — ~180KB gzipped
2. **Chat components** (Socket.IO) — carregados mesmo sem visitar /chat
3. **Formularios complexos** (ProposalForm, ClaimForm) — carregados antecipadamente

## Correcao

```typescript
import dynamic from 'next/dynamic'

// Dashboard charts
const ProposalsByStageChart = dynamic(
  () => import('@/features/dashboard/components/proposals-by-stage-chart'),
  { loading: () => <ChartSkeleton />, ssr: false }
)

// Chat panel (heavy Socket.IO logic)
const ChatPanel = dynamic(
  () => import('@/features/chat/components/chat-panel'),
  { loading: () => <ChatSkeleton /> }
)

// Complex forms (loaded on demand)
const ProposalForm = dynamic(
  () => import('@/features/proposals/components/proposal-form'),
  { loading: () => <FormSkeleton /> }
)
```

## Verificacao

Rodar `next/bundle-analyzer` para medir impacto:

```bash
ANALYZE=true pnpm build --filter web
```

## Criterios de Aceite

- [ ] Charts carregados com `dynamic()` e `ssr: false`
- [ ] Chat components lazy-loaded
- [ ] Skeleton loaders durante carregamento
- [ ] Bundle inicial reduzido (medir com bundle-analyzer)
