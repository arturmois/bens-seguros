# F03. Geracao de Documentos PDF

> **Esforco:** G (1-2 semanas) | **Impacto:** Retencao + Diferenciacao | **Prioridade:** Mes 3

---

## Descricao

Cotacoes, propostas, apolices e relatorios de comissao em PDF profissional com branding da corretora.

## Por Que

Corretores enviam cotacoes e documentos para clientes diariamente. Gerar PDF direto no sistema economiza tempo e padroniza comunicacao.

## Problema que Resolve

Corretor gera documentos manualmente fora do sistema (Word, Excel, email). Sem padronizacao.

## Stack Tecnica

- `@react-pdf/renderer` (ja listado na spec) — renderiza JSX para PDF
- Gerar server-side via API route (nao client-side)

## Tipos de PDF

### 1. Cotacao (Proposta em estagio COTACAO)

```
┌─────────────────────────────┐
│ [Logo Corretora]            │
│ COTACAO DE SEGURO           │
│ ─────────────────────────── │
│ Cliente: João Silva         │
│ CPF: ***456.789-**          │
│ ─────────────────────────── │
│ Ramo: Auto                  │
│ Seguradora: Porto Seguro    │
│ Premio: R$ 2.500,00         │
│ Franquia: R$ 1.200,00       │
│ ─────────────────────────── │
│ Coberturas:                 │
│ • Colisao         R$ 80.000 │
│ • Terceiros       R$ 50.000 │
│ • APP             R$ 20.000 │
│ ─────────────────────────── │
│ Validade: 15 dias           │
│ Data: 24/03/2026            │
│ Corretor: Maria Santos      │
│ CRECI: 12345                │
└─────────────────────────────┘
```

### 2. Resumo de Apolice

```
Dados da apolice, vigencia, coberturas, valor premio, parcelas.
```

### 3. Relatorio de Comissoes (Periodo)

```
Tabela com comissoes do periodo, totais por status, totais por corretor.
```

## Implementacao

### Backend

```typescript
// apps/server/src/routes/v1/proposal-routes.ts
// GET /api/v1/proposals/:id/pdf

import { renderToBuffer } from '@react-pdf/renderer'
import { ProposalQuotePdf } from './pdf-templates/proposal-quote'

app.get('/:id/pdf', {
  preHandler: [requireAuth, requireAbility('read', 'Proposal')],
  handler: async (request, reply) => {
    const proposal = await getProposal.execute({ id: request.params.id })
    const org = await getOrganization.execute({ id: request.organizationId })
    const buffer = await renderToBuffer(
      <ProposalQuotePdf proposal={proposal} organization={org} />
    )
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename=cotacao-${proposal.id}.pdf`)
      .send(buffer)
  },
})
```

### Templates

```
packages/core/src/shared/pdf-templates/
  proposal-quote.tsx     (~150 linhas)
  policy-summary.tsx     (~120 linhas)
  commission-report.tsx  (~130 linhas)
  shared/
    pdf-header.tsx       (logo + nome corretora)
    pdf-footer.tsx       (data, pagina, CRECI)
    pdf-styles.ts        (StyleSheet)
```

### Frontend

```typescript
// Botao na pagina de proposta:
<Button onClick={() => window.open(`/api/v1/proposals/${id}/pdf`, '_blank')}>
  <FileText className="h-4 w-4" />
  Gerar PDF
</Button>
```

## Pre-requisitos

- Upload de logo da corretora (Settings > Organizacao)
- Dados completos da proposta (segurados, coberturas, valores)

## Criterios de Aceite

- [ ] PDF de cotacao com logo, dados do cliente, coberturas, valores
- [ ] PDF de apolice com vigencia, parcelas
- [ ] PDF de relatorio de comissoes por periodo
- [ ] PII mascarado no PDF (CPF parcial conforme role)
- [ ] Branding customizavel (logo, cores)
- [ ] Renderizacao server-side (nao client)
- [ ] Download e visualizacao inline
