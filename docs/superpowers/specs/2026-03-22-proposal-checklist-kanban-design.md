# Proposal Checklist + Kanban Board — Design Spec

## Overview

Implementar checklist por etapa nas propostas (com validacao de avanço) e quadro Kanban para visualizacao do pipeline de propostas. Duas features complementares: o checklist garante que o processo de seguro segue os requisitos documentais, e o kanban dá visibilidade gerencial ao pipeline.

---

## Feature 1: Proposal Checklist

### Regras de Negocio

1. **Itens por etapa + ramo:** Cada combinacao de `ProposalStage` x `InsuranceBranch` tem um conjunto de itens de checklist. Base comum para todos os ramos + itens extras por ramo.

2. **Completion sources:**
   - `MANUAL` — usuario marca checkbox
   - `ATTACHMENT` — upload de documento marca item como completo automaticamente

3. **Bloqueio de avanço:** Todos os itens obrigatorios da etapa atual devem estar completos para avançar. **Excecao:** CAPTURE nunca bloqueia (FR-006) — o corretor está capturando o lead e ainda nao tem todos os documentos.

4. **Configuracao:** Constantes no codigo via interface `ChecklistConfigProvider`. Permite trocar source (de constante para banco/settings) no futuro sem mudar consumers.

### Schema (existente — ProposalChecklistItem)

```prisma
model ProposalChecklistItem {
  id          String    @id @default(cuid())
  proposalId  String
  itemKey     String
  label       String
  isRequired  Boolean   @default(true)
  isCompleted Boolean   @default(false)
  completedAt DateTime?
  completedBy String?
  createdAt   DateTime  @default(now())

  proposal Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)

  @@unique([proposalId, itemKey])
  @@index([proposalId])
}
```

### Configuracao de Itens (constantes)

```ts
interface ChecklistConfigProvider {
  getItems(stage: ProposalStage, branch: InsuranceBranch): ChecklistItemConfig[]
}

interface ChecklistItemConfig {
  itemKey: string
  label: string
  isRequired: boolean
  documentType?: string // se presente, item pode ser completado via upload
}
```

**Base comum (todos os ramos):**

| Stage      | Items                                                     |
| ---------- | --------------------------------------------------------- |
| CAPTURE    | Dados do cliente preenchidos                              |
| QUOTE      | Cotacao enviada ao cliente, Cotacao aprovada pelo cliente |
| PROTOCOL   | Proposta protocolada na seguradora                        |
| INSPECTION | Inspecao/vistoria realizada                               |
| PAYMENT    | Pagamento confirmado                                      |

**Extras por ramo:**

| Branch      | Stage      | Items extras                                                   |
| ----------- | ---------- | -------------------------------------------------------------- |
| AUTO        | CAPTURE    | CNH do condutor (doc), CRLV do veiculo (doc), Fotos do veiculo |
| AUTO        | INSPECTION | Vistoria realizada (doc)                                       |
| VIDA        | CAPTURE    | Declaracao de saude (doc)                                      |
| RESIDENCIAL | CAPTURE    | Comprovante de residencia (doc)                                |
| EMPRESARIAL | CAPTURE    | Contrato social (doc), CNPJ (doc)                              |

### Backend

**Use cases (packages/core/src/modules/proposal/):**

- `InitializeChecklist` — cria itens para uma etapa+ramo. Chamado ao criar proposta e ao avancar etapa.
- `ToggleChecklistItem` — marca/desmarca item (MANUAL).
- `CompleteChecklistByAttachment` — marca item como completo quando documento é uploadado.
- `ListChecklistItems` — lista items da proposta com status.
- `GetChecklistSummary` — retorna contagem (total, completed, canAdvance).
- `ValidateChecklistForAdvance` — verifica se pode avancar (chamado por AdvanceProposalStage).

**Modificacoes em use cases existentes:**

- `AdvanceProposalStage` — adicionar validacao de checklist (bloqueia se incompleto, exceto CAPTURE).
- `CreateProposal` — inicializar checklist da primeira etapa.

**API routes (apps/server/src/routes/v1/proposal-routes.ts):**

- `GET /api/v1/proposals/:id/checklist` — lista items + summary
- `POST /api/v1/proposals/:id/checklist/:itemId/toggle` — toggle manual
- `POST /api/v1/proposals/:id/checklist/:itemId/upload` — upload documento que completa item

### Frontend

**Checklist Panel** no proposal-detail (sidebar colapsavel):

- Agrupa items por stage (accordion)
- Stage atual expandida, anteriores colapsadas com badge "N/N completos"
- Cada item: checkbox + label + badge de status (manual/attachment)
- Items com `documentType`: botao de upload inline
- Barra de progresso por stage
- Quando incompleto: botao "Avancar Etapa" desabilitado + tooltip com items pendentes

---

## Feature 2: Kanban Board

### Visao Geral

Pagina `/proposals/kanban` — visualizacao do pipeline de propostas em colunas por etapa. Cada coluna = um `ProposalStage`. Cards arrastáveis entre colunas (avanca/reverte etapa).

### Tecnologia

- **@dnd-kit/core + @dnd-kit/sortable** — suporte touch, keyboard, animacoes
- Substitui HTML5 DnD nativo do template de referencia

### Colunas (ProposalStage)

| Coluna        | Cor     |
| ------------- | ------- |
| CAPTURE       | blue    |
| QUOTE         | amber   |
| PROTOCOL      | orange  |
| INSPECTION    | purple  |
| PAYMENT       | emerald |
| POLICY_ISSUED | green   |
| LOST          | red     |

### Card da Proposta

Cada card mostra:

- Nome do cliente
- Ramo (badge colorido)
- Valor do premio (formatado BRL)
- Vendedor (avatar + nome)
- Progresso do checklist (mini progress bar: "3/5")
- Prioridade se houver

### Drag & Drop

- Arrastar card entre colunas = avancar/reverter etapa via API
- Se checklist incompleto ao dropar: mostra toast de erro + reverte card para coluna original
- Restricoes: nao pode mover de POLICY_ISSUED ou LOST (etapas terminais)
- Nao pode pular etapas (so avancar uma por vez, ou reverter)

### Card Detail

- Click no card abre dialog com:
  - Dados resumidos da proposta
  - Checklist panel inline (mesmo componente do proposal-detail)
  - Link "Ver detalhes" que navega para `/proposals/:id`

### Backend

- Reutiliza `ListProposals` existente (com filtros de stage)
- Reutiliza `AdvanceProposalStage` e `RevertProposalStage` para drag actions
- Nao precisa de novas rotas — frontend orquestra via APIs existentes

### Frontend

**Arquivos:**

```
apps/web/src/features/proposals/
├── components/
│   ├── proposal-kanban.tsx          # Board principal com @dnd-kit
│   ├── kanban-column.tsx            # Coluna por stage
│   ├── kanban-card.tsx              # Card da proposta
│   └── kanban-card-detail.tsx       # Dialog de detalhe
├── hooks/
│   └── use-kanban-proposals.ts      # Hook que agrupa propostas por stage
```

**Pagina:** `apps/web/src/app/(dashboard)/proposals/kanban/page.tsx`

**Navegacao:** Adicionar toggle "Lista / Kanban" na toolbar da pagina de propostas.

---

## Escopo Explicito: Fora

- Configuracao dinamica de checklist (UI admin) — futuro
- Auto-complete baseado em dados preenchidos (DATA_INFORMED) — futuro
- Document viewer inline (preview PDF/imagem) — futuro
- Notificacao quando checklist fica completo — futuro
- Filtros avancados no kanban (por vendedor, ramo, periodo) — futuro

---

## Dependencias

- Prisma schema `ProposalChecklistItem` ja existe
- Sistema de documentos (`UploadDocument`, `DocumentUpload` component) ja existe
- `AdvanceProposalStage`, `RevertProposalStage`, `ListProposals` ja existem
- `@dnd-kit` precisa ser instalado como nova dependencia
