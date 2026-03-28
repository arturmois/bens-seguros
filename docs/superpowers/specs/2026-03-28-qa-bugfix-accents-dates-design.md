# QA Bug Fixes: Acentos PT-BR, Email/Telefone, Data Off-by-One

**Data:** 2026-03-28
**Status:** Aprovado
**Escopo:** 3 bug fixes encontrados durante QA automatizado

---

## Bug 1: ~20 strings PT-BR sem acentos/diacríticos

### Problema

Strings de UI em português brasileiro estão sem acentos obrigatórios, violando a regra do CLAUDE.md que exige diacríticos corretos em todas as strings de display.

### Arquivos e correções

**Frontend (7 arquivos, 15 strings):**

| Arquivo                                                              | De                           | Para                         |
| -------------------------------------------------------------------- | ---------------------------- | ---------------------------- |
| `apps/web/src/features/dashboard/components/stats-cards.tsx`         | `Apolices ativas`            | `Apólices ativas`            |
| `apps/web/src/features/dashboard/components/stats-cards.tsx`         | `Comissoes pendentes`        | `Comissões pendentes`        |
| `apps/web/src/features/dashboard/components/financial-metrics.tsx`   | `Premio total emitido`       | `Prêmio total emitido`       |
| `apps/web/src/features/dashboard/components/financial-metrics.tsx`   | `Ticket medio`               | `Ticket médio`               |
| `apps/web/src/features/dashboard/components/financial-metrics.tsx`   | `Comissoes a receber`        | `Comissões a receber`        |
| `apps/web/src/features/dashboard/components/proposals-by-stage.tsx`  | `Propostas por estagio`      | `Propostas por estágio`      |
| `apps/web/src/features/dashboard/components/proposals-by-stage.tsx`  | `Captacao`                   | `Captação`                   |
| `apps/web/src/features/dashboard/components/proposals-by-stage.tsx`  | `Cotacao`                    | `Cotação`                    |
| `apps/web/src/features/dashboard/components/commissions-summary.tsx` | `Comissoes do mes`           | `Comissões do mês`           |
| `apps/web/src/features/dashboard/components/trend-chart.tsx`         | `Tendencia`                  | `Tendência`                  |
| `apps/web/src/features/dashboard/components/broker-ranking.tsx`      | `apolice emitida no periodo` | `apólice emitida no período` |
| `apps/web/src/features/dashboard/components/broker-ranking.tsx`      | `Premio Total`               | `Prêmio Total`               |
| `apps/web/src/features/dashboard/components/broker-ranking.tsx`      | `Ticket Medio`               | `Ticket Médio`               |
| `apps/web/src/app/(auth)/register/page.tsx`                          | `Ja tem conta?`              | `Já tem conta?`              |
| `apps/web/src/features/documents/components/document-upload.tsx`     | `Maximo 10 MB` (2x)          | `Máximo 10 MB`               |
| `apps/web/src/features/claims/components/claims-toolbar.tsx`         | `numero` e `apolice`         | `número` e `apólice`         |

**Backend (1 arquivo, 5 strings):**

| Arquivo                                                         | De                              | Para                            |
| --------------------------------------------------------------- | ------------------------------- | ------------------------------- |
| `packages/core/src/modules/proposal/domain/checklist-config.ts` | `Cotacao enviada ao cliente`    | `Cotação enviada ao cliente`    |
| `packages/core/src/modules/proposal/domain/checklist-config.ts` | `Cotacao aprovada pelo cliente` | `Cotação aprovada pelo cliente` |
| `packages/core/src/modules/proposal/domain/checklist-config.ts` | `Inspecao/vistoria realizada`   | `Inspeção/vistoria realizada`   |
| `packages/core/src/modules/proposal/domain/checklist-config.ts` | `CRLV do veiculo`               | `CRLV do veículo`               |
| `packages/core/src/modules/proposal/domain/checklist-config.ts` | `Fotos do veiculo`              | `Fotos do veículo`              |

---

## Bug 2: Email e Telefone mostrando "-" na tabela de clientes

### Problema

A listagem de clientes mostra "-" nas colunas Email e Telefone, mesmo quando os dados existem. O detalhe do cliente exibe os valores corretamente.

### Causa raiz

`ClientPresenter.toList()` em `packages/core/src/modules/client/application/client-presenter.ts` intencionalmente omite `email` e `phone` do response. O frontend renderiza `client.email ?? '-'`, e como o campo é `undefined`, sempre mostra "-".

### Fix

Adicionar `email` e `phone` à interface `ClientListItem` e ao método `toList()`:

```typescript
// Em client-presenter.ts
interface ClientListItem {
  // ... campos existentes
  email?: string | null    // ADICIONAR
  phone?: string | null    // ADICIONAR
}

toList(client: ClientData): ClientListItem {
  return {
    // ... campos existentes
    email: client.email,   // ADICIONAR
    phone: client.phone,   // ADICIONAR
  }
}
```

Nenhuma mudança no frontend necessária — já renderiza os campos.

---

## Bug 3: Data da vigência off-by-one (timezone)

### Problema

Ao emitir apólice com vigência 28/03/2026 → 28/04/2026, o sistema exibe 27/03/2026 → 27/04/2026.

### Causa raiz

`new Date("2026-03-28")` cria UTC midnight. `formatDate()` em `formatters.ts` usa `timeZone: 'America/Sao_Paulo'`, convertendo UTC 00:00 28/03 para BRT 21:00 27/03 — mostrando o dia anterior.

Fix parcial já existe (commit `63bb088`) em `client-form-fields.tsx`, mas não foi propagado para outros formulários.

### Fix (3 pontos)

**1. `apps/web/src/lib/formatters.ts`:**
Mudar `timeZone: 'America/Sao_Paulo'` para `timeZone: 'UTC'` no `dateFormatter`.

**2. `apps/web/src/features/proposals/components/issue-policy-sheet.tsx`:**
Atualizar `parseDateString()` e `formatDateToISO()` para o padrão correto:

```typescript
function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00Z`) // Explícito UTC
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function formatDateToISO(date: Date | undefined): string {
  if (!date) return ''
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

**3. Mesma correção em:**

- `endorsement-form.tsx`
- `assistance-form.tsx`
- `claim-form.tsx`

---

## Verificação

Após as correções:

1. `pnpm typecheck` — zero errors
2. `pnpm lint` — zero errors
3. `pnpm build` — successful
4. QA visual via Playwright confirmando strings corrigidas, email/phone na tabela, e datas corretas
