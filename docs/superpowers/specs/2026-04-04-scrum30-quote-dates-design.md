# SCRUM-30: Informação de Datas nas Cotações — Design Spec

**Jira:** SCRUM-30 | **Prioridade:** Highest | **Data:** 2026-04-04

---

## Resumo

Adicionar campos de datas de vigência e processo nas propostas, com geração de PDF comercial e envio por e-mail ao cliente via worker BullMQ + Resend.

## Decisões de Design

| Decisão                | Escolha                                                     | Alternativas descartadas                     |
| ---------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| Envio da cotação       | PDF por e-mail                                              | WhatsApp, ambos, só marcar manual            |
| Template PDF           | Detalhado/comercial (logo, coberturas, condições, validade) | Simples, reutilizar template apólice         |
| Remetente e-mail       | `noreply@bensseg.com` via Resend, reply-to do vendedor      | SMTP por tenant, remetente fixo sem reply-to |
| Validade default       | 15 dias a partir da criação, editável                       | Sem default, configurável por org            |
| Disponibilidade campos | Qualquer estágio, todos opcionais                           | Restrito a CAPTURE ou QUOTE                  |
| Kanban card            | Só vigência início                                          | Vigência + validade, nenhuma data            |
| Arquitetura envio      | Worker BullMQ (assíncrono)                                  | Síncrono na API                              |

---

## 1. Schema e Domain

### 1.1 Prisma — Novos campos na model Proposal

```prisma
coverageStartDate   DateTime?
coverageEndDate     DateTime?
sentToClientAt      DateTime?
clientResponseAt    DateTime?
quoteValidUntil     DateTime?
```

Todos opcionais (nullable). Migração Prisma para adicionar as 5 colunas.

### 1.2 Domain Entity (`packages/core/src/modules/proposal/domain/proposal.ts`)

Novas propriedades em `ProposalProps`:

```typescript
coverageStartDate: Date | null
coverageEndDate: Date | null
sentToClientAt: Date | null
clientResponseAt: Date | null
quoteValidUntil: Date | null
```

Novos métodos:

- `markAsSentToClient()` — seta `sentToClientAt = new Date()`
- `updateCoverageDates(start: Date, end: Date)` — validação: `end > start`
- `updateClientResponse(date: Date)` — seta `clientResponseAt`
- `updateQuoteValidity(date: Date)` — seta `quoteValidUntil`
- Getter `isQuoteExpired`: `quoteValidUntil !== null && quoteValidUntil < now`

### 1.3 Mapper

Atualiza `toDomain()` e `toPersistence()` com os 5 campos.

### 1.4 Default de quoteValidUntil

No use case de criação de proposta, ao criar: `quoteValidUntil = createdAt + 15 dias`. Lógica no domínio/use case, não no banco.

---

## 2. API Routes

### 2.1 Rotas existentes alteradas

**`PATCH /api/v1/proposals/:id`** — adiciona campos editáveis ao body schema:

- `coverageStartDate` (ISO date string, optional)
- `coverageEndDate` (ISO date string, optional)
- `clientResponseAt` (ISO date string, optional)
- `quoteValidUntil` (ISO date string, optional)

Validação: se ambos `coverageStartDate` e `coverageEndDate` presentes, `end > start`.

**`GET /api/v1/proposals/:id`** — response schema inclui os 5 campos.

`sentToClientAt` **não é editável** via PATCH — só o worker seta via `markAsSentToClient()`.

### 2.2 Nova rota

**`POST /api/v1/proposals/:id/send-quote`**

- **Pré-condições:**
  - Proposta existe e pertence ao tenant
  - Cliente tem e-mail cadastrado (senão 422: "Cliente não possui e-mail cadastrado")
  - Proposta não está em LOST (senão 422: "Não é possível enviar cotação para proposta perdida")
- **Ação:** Enfileira job `SEND_QUOTE` no BullMQ com `{ proposalId, organizationId }`
- **Response:** `202 Accepted` — `{ success: true, data: { message: "Cotação sendo enviada" } }`
- **Reenvio:** Permitido. Sobrescreve `sentToClientAt` com nova data.

---

## 3. Worker — Geração de PDF e Envio de E-mail

### 3.1 Job `SEND_QUOTE` no `apps/worker`

Fluxo do processador:

1. Busca proposta completa (com client, salesperson, insurer, organization)
2. Gera PDF com template comercial
3. Envia e-mail via Resend
4. Atualiza `sentToClientAt` no banco via repository
5. Se falhar: 3 retries com backoff exponencial
6. Dead letter queue se todas as tentativas falharem

### 3.2 Template do PDF

Uma página A4, layout comercial:

```
┌─────────────────────────────────────┐
│  [Logo Corretora]    COTAÇÃO DE     │
│  Nome da Corretora   SEGURO         │
│  CNPJ / Telefone / E-mail          │
├─────────────────────────────────────┤
│  DADOS DO CLIENTE                   │
│  Nome, CPF/CNPJ, Endereço,         │
│  Telefone, E-mail                   │
├─────────────────────────────────────┤
│  DADOS DA COTAÇÃO                   │
│  Ramo, Seguradora, Tipo (Novo/     │
│  Renovação/Endosso)                 │
├─────────────────────────────────────┤
│  VIGÊNCIA PROPOSTA                  │
│  Início: DD/MM/YYYY                │
│  Fim: DD/MM/YYYY                    │
├─────────────────────────────────────┤
│  OBJETO SEGURADO                    │
│  (Varia por ramo: auto, residencial,│
│   condomínio, vida)                 │
├─────────────────────────────────────┤
│  CONDIÇÕES COMERCIAIS               │
│  Prêmio Total: R$ X.XXX,XX         │
│  Comissão: XX%                      │
├─────────────────────────────────────┤
│  Validade: DD/MM/YYYY               │
│                                     │
│  Dados de contato do vendedor       │
│  Nome / Telefone / E-mail          │
└─────────────────────────────────────┘
```

- Logo: usa `organization.logo` (campo já existe no schema). Se null, exibe nome da corretora em texto.
- Objeto segurado: renderiza campos conforme ramo (auto, residencial, condomínio, vida).
- Lib de PDF: mesma já usada pelo worker existente.

### 3.3 E-mail via Resend

- **From:** `Bens Seguros <noreply@bensseg.com>`
- **Reply-To:** e-mail do vendedor (salesperson) da proposta
- **To:** e-mail do cliente
- **Subject:** `Cotação de Seguro — [Nome da Corretora]`
- **Body HTML:** mensagem breve informando que a cotação segue em anexo
- **Attachment:** PDF gerado

---

## 4. Frontend

### 4.1 Proposal Detail (`proposal-detail.tsx`)

Nova seção "Datas" no grid de informações:

| Campo               | Tipo       | Editável | Comportamento                                 |
| ------------------- | ---------- | -------- | --------------------------------------------- |
| Vigência Início     | DatePicker | Sim      | PATCH ao alterar                              |
| Vigência Fim        | DatePicker | Sim      | PATCH ao alterar, validação end > start       |
| Validade da Cotação | DatePicker | Sim      | PATCH ao alterar, badge "Vencida" se expirada |
| Enviada em          | Texto      | Não      | Somente leitura, preenchido pelo worker       |
| Resposta do Cliente | DatePicker | Sim      | PATCH ao alterar                              |
| Criado em           | Texto      | Não      | Já existe                                     |
| Atualizado em       | Texto      | Não      | Já existe                                     |

### 4.2 Botão "Enviar Cotação"

- Posição: header do detalhe da proposta (ao lado dos botões existentes)
- **Desabilitado se:** cliente sem e-mail, proposta em LOST
- **Texto dinâmico:** "Enviar Cotação" se nunca enviada, "Reenviar Cotação" se `sentToClientAt` existe
- **Ao clicar:** dialog de confirmação com preview (destinatário, vigência, prêmio)
- **Após confirmar:** `POST /proposals/:id/send-quote`, toast "Cotação sendo enviada..."
- **Atualização:** invalida query da proposta após 3s para mostrar `sentToClientAt`

### 4.3 Kanban Card

Adiciona linha discreta: `Vigência: DD/MM/YYYY` quando `coverageStartDate` preenchido.

---

## 5. Tratamento de Erros

| Cenário                             | Comportamento                                                    |
| ----------------------------------- | ---------------------------------------------------------------- |
| Cliente sem e-mail                  | 422, toast "Cliente não possui e-mail cadastrado"                |
| Proposta em LOST                    | 422, toast "Não é possível enviar cotação para proposta perdida" |
| Resend fora do ar                   | Worker retenta 3x (backoff exponencial), dead letter se falhar   |
| coverageEndDate < coverageStartDate | 422, toast "Data de fim deve ser posterior à data de início"     |
| Reenvio                             | Permitido, sobrescreve sentToClientAt                            |

---

## 6. Testes

### 6.1 Unitários (packages/core)

- Domain: `markAsSentToClient()`, `updateCoverageDates()` (validação end > start), `isQuoteExpired`
- Use case `SendQuote`: valida pré-condições (e-mail, stage), enfileira job
- Use case `CreateProposal`: verifica `quoteValidUntil` default 15 dias

### 6.2 Worker

- Processor `SEND_QUOTE`: mock Resend + Prisma, verifica PDF gerado e `sentToClientAt` atualizado

### 6.3 Frontend

- Botão desabilitado quando cliente sem e-mail
- Dialog de confirmação mostra dados corretos
- Badge "Vencida" quando `quoteValidUntil < now`

---

## 7. Arquivos Impactados

| Camada           | Arquivos                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| **Schema**       | `packages/db/prisma/schema.prisma`                                                                  |
| **Domain**       | `packages/core/src/modules/proposal/domain/proposal.ts`                                             |
| **Mapper**       | `packages/core/src/modules/proposal/infrastructure/proposal-mapper.ts`                              |
| **Use Cases**    | `packages/core/src/modules/proposal/application/create-proposal.ts`, novo `send-quote.ts`           |
| **Testes**       | `packages/core/src/modules/proposal/application/create-proposal.spec.ts`, novo `send-quote.spec.ts` |
| **API Schemas**  | `apps/server/src/routes/v1/proposals/_schemas.ts`                                                   |
| **API Routes**   | `apps/server/src/routes/v1/proposals/` — atualiza PATCH, GET; nova rota send-quote                  |
| **Worker**       | `apps/worker/src/processors/` — novo processor `send-quote.ts`                                      |
| **PDF Template** | `apps/worker/src/templates/` — novo template `quote-pdf.ts`                                         |
| **Frontend**     | `apps/web/src/features/proposals/components/proposal-detail.tsx`, `proposal-kanban.tsx`             |
| **Orval**        | Regenerar após mudanças na API                                                                      |
