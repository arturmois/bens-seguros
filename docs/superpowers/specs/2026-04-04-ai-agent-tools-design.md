# AI Agent Tools — Design Spec

## Context

The insurance broker AI agent (`agents/prompt.md`) handles 4 flows: quotes, urgency/claims, financial inquiries, and human handoff. Today only 3 tools exist (`escalarParaHumano`, `consultarProdutos`, `captarLead`) — they cover basic lead capture and escalation but cannot complete any flow end-to-end.

This spec defines 8 new tools + renaming of 3 existing tools to English, giving the agent full autonomy across all flows.

## Decisions

| Decision                      | Choice                                                           | Rationale                                                         |
| ----------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| Communication pattern         | Internal routes via HMAC                                         | Existing infra, respects service boundaries, auditable            |
| Product data source           | Enriched hardcoded                                               | No new DB model; tenant-specific catalog is a future ERP feature  |
| Claim without policy          | Hybrid — create if policy found, save metadata + escalate if not | Maximizes automation without blocking on missing data             |
| Financial inquiry persistence | Conversation metadata (MongoDB)                                  | Field already exists, no schema change, visible to human agents   |
| Client search criteria        | Phone + CPF/CNPJ                                                 | Phone is automatic (WhatsApp), CPF for identity confirmation      |
| Code language                 | English identifiers, PT-BR tool descriptions only                | Project convention; PT-BR descriptions improve LLM tool selection |

## Architecture

```
chat-worker (AI Bot Processor)
├── tools/
│   ├── escalate-to-human.ts        (rename from escalar-para-humano.ts)
│   ├── list-products.ts            (rename+enrich from consultar-produtos.ts)
│   ├── capture-lead.ts             (rename from captar-lead.ts)
│   ├── search-client.ts            (NEW)
│   ├── update-client-data.ts       (NEW)
│   ├── report-claim.ts             (NEW)
│   ├── register-financial-inquiry.ts (NEW)
│   ├── collect-insured-asset-data.ts (NEW)
│   ├── search-proposal.ts          (NEW)
│   └── search-policy.ts            (NEW)
│
│   All tools call apps/server via HMAC-authenticated HTTP
│   Exception: registerFinancialInquiry (local MongoDB + reuses escalation)
│
└── processors/
    ├── ai-bot-processor.ts          (register 10 tools, bump maxSteps to 10)
    └── ai-bot-helpers.ts            (update system prompt builder)

apps/server
└── src/routes/internal/
    ├── create-lead.ts               (exists)
    ├── search-clients.ts            (NEW)
    ├── update-client.ts             (NEW)
    ├── create-claim.ts              (NEW)
    ├── list-proposals.ts            (NEW)
    ├── list-policies.ts             (NEW)
    └── update-proposal-details.ts   (NEW)
```

## Tools Specification

### Existing Tools (renamed to English)

#### 1. `escalateToHuman` (was `escalarParaHumano`)

**File:** `apps/chat-worker/src/tools/escalate-to-human.ts`

**Description (PT-BR):** Transfere a conversa para um atendente humano. Use quando: cliente pedir explicitamente, decisao humana necessaria, assuntos sensiveis (sinistros, reclamacoes).

**Parameters:**

```typescript
{
  reason: z.string().describe('Motivo da transferencia para atendente humano')
}
```

**Behavior:** Unchanged — sets conversation status to `WAITING_HUMAN`, saves system message.

**Return:** `{ transferred: true, reason: string }`

---

#### 2. `listProducts` (was `consultarProdutos`, now enriched)

**File:** `apps/chat-worker/src/tools/list-products.ts`

**Description (PT-BR):** Lista tipos de seguro disponiveis com detalhes de coberturas e dados necessarios. Use para informar o cliente sobre opcoes de seguro.

**Parameters:**

```typescript
{
  insuranceType: z.enum([
    'AUTO',
    'LIFE',
    'RESIDENTIAL',
    'BUSINESS',
    'TRAVEL',
    'CONDOMINIUM',
    'OTHER',
  ])
    .optional()
    .describe(
      'Tipo especifico de seguro para detalhar. Se omitido, retorna todos.'
    )
}
```

**Return (per product):**

```typescript
{
  type: 'AUTO',
  name: 'Seguro Auto',
  description: 'Protecao completa para seu veiculo contra roubo, furto, colisao e danos a terceiros.',
  basicCoverages: ['Roubo e furto', 'Colisao (parcial e total)', 'Incendio', 'Danos a terceiros'],
  optionalCoverages: ['Vidros', 'Carro reserva', 'Assistencia 24h', 'Protecao para acessorios'],
  requiredData: ['Placa do veiculo', 'Modelo e ano', 'CPF do proprietario', 'CEP de pernoite'],
  note: 'O valor do seguro varia conforme perfil do motorista, regiao e modelo do veiculo.'
}
```

**All 7 product types enriched:** AUTO, LIFE, RESIDENTIAL, BUSINESS, TRAVEL, CONDOMINIUM, OTHER (civil liability).

---

#### 3. `captureLead` (was `captarLead`)

**File:** `apps/chat-worker/src/tools/capture-lead.ts`

**Description (PT-BR):** Captura interesse do cliente e cria proposta de seguro. Use quando o cliente demonstra interesse em contratar um seguro e voce ja coletou nome e tipo.

**Parameters:**

```typescript
{
  clientName: z.string().describe('Nome completo do cliente'),
  insuranceType: z.enum(['AUTO', 'LIFE', 'RESIDENTIAL', 'BUSINESS', 'TRAVEL', 'OTHER'])
    .describe('Tipo de seguro desejado'),
  details: z.string().optional().describe('Detalhes adicionais: modelo do veiculo, endereco, etc.')
}
```

**Behavior:** Unchanged — calls `POST /api/internal/leads`.

**Return:** `{ success: boolean, message: string, data: { proposalId, clientId } }`

---

### New Tools

#### 4. `searchClient`

**File:** `apps/chat-worker/src/tools/search-client.ts`

**Description (PT-BR):** Busca cliente cadastrado por telefone ou CPF/CNPJ. Use para verificar se o cliente ja possui cadastro, apolices ou propostas antes de coletar dados.

**Parameters:**

```typescript
{
  phone: z.string().optional().describe('Numero de telefone do cliente'),
  document: z.string().optional().describe('CPF (11 digitos) ou CNPJ (14 digitos) do cliente')
}
// At least one required (validated in tool logic)
```

**Internal route:** `GET /api/internal/clients/search?phone={}&document={}`

**Server behavior:**

1. If `document` provided: hash it, query `Client` by `documentHash` + `organizationId`
2. If `phone` provided: query `Client` by `phone` + `organizationId`
3. Include counts: `_count: { proposals, policies }` and check for active policies

**Return:**

```typescript
{
  found: boolean,
  client?: {
    id: string,
    name: string,
    type: 'LEAD' | 'CLIENT' | 'FORMER_CLIENT',
    email: string | null,
    phone: string | null,
    hasActivePolicy: boolean,
    activePoliciesCount: number,
    openProposalsCount: number
  }
}
```

---

#### 5. `updateClientData`

**File:** `apps/chat-worker/src/tools/update-client-data.ts`

**Description (PT-BR):** Atualiza dados cadastrais do cliente (CPF, email, endereco, nascimento). Use apos identificar o cliente para completar ou corrigir informacoes.

**Parameters:**

```typescript
{
  clientId: z.string().describe('ID do cliente (obtido via searchClient ou captureLead)'),
  document: z.string().optional().describe('CPF (11 digitos) ou CNPJ (14 digitos)'),
  email: z.string().email().optional().describe('Email do cliente'),
  address: z.object({
    zipCode: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional()
  }).optional().describe('Endereco do cliente'),
  birthDate: z.string().optional().describe('Data de nascimento (YYYY-MM-DD)'),
  profession: z.string().optional(),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COMMON_LAW']).optional()
}
```

**Internal route:** `PUT /api/internal/clients/:id`

**Server behavior:**

1. Validate document format (CPF: 11 digits, CNPJ: 14 digits)
2. Encrypt document, generate hash
3. Partial update — only provided fields
4. If client type is `LEAD` and `document` is now provided, promote to `CLIENT`

**Return:** `{ success: true, message: string }`

---

#### 6. `reportClaim`

**File:** `apps/chat-worker/src/tools/report-claim.ts`

**Description (PT-BR):** Registra um sinistro. Se encontrar apolice ativa do cliente, cria o sinistro no sistema. Se nao encontrar, salva os dados e transfere para um corretor. Use no fluxo de urgencia/emergencia.

**Parameters:**

```typescript
{
  phoneOrDocument: z.string().describe('Telefone ou CPF/CNPJ para identificar o cliente'),
  description: z.string().describe('Descricao do que aconteceu'),
  incidentDate: z.string().optional().describe('Data do incidente (YYYY-MM-DD)'),
  incidentLocation: z.string().optional().describe('Local do incidente'),
  insuranceType: z.enum(['AUTO', 'RESIDENTIAL', 'LIFE', 'BUSINESS', 'TRAVEL', 'OTHER']).optional()
    .describe('Tipo de seguro relacionado ao sinistro'),
  conversationId: z.string().describe('ID da conversa atual')
}
```

**Internal route:** `POST /api/internal/claims`

**Server behavior (hybrid):**

1. Search client by phone or document
2. If client found → search active policy matching `insuranceType` (or any active policy)
3. **Policy found:** Create Claim via `CreateClaim` use case with priority `URGENT`, status `REGISTERED`
4. **No policy (or no client):** Return `claimCreated: false` with structured data for metadata storage

**Chat-worker behavior after server response:**

- If `claimCreated: false`: save claim data to `conversation.metadata.claimData`, then escalate to human
- If `claimCreated: true`: return success message to bot

**Return:**

```typescript
// Policy found
{ claimCreated: true, claimNumber: 'SIN-2026-0042', message: string }

// No policy
{ claimCreated: false, dataSaved: true, message: string }
```

---

#### 7. `registerFinancialInquiry`

**File:** `apps/chat-worker/src/tools/register-financial-inquiry.ts`

**Description (PT-BR):** Registra duvida financeira do cliente (pagamento, boleto, etc.) com dados de contexto e transfere para atendente especializado. Use quando o motivo do contato e financeiro.

**Parameters:**

```typescript
{
  document: z.string().describe('CPF ou CNPJ do cliente'),
  vehiclePlate: z.string().optional().describe('Placa do veiculo (se seguro auto)'),
  vehicleModel: z.string().optional().describe('Modelo do veiculo'),
  inquiryDescription: z.string().describe('Resumo da duvida financeira'),
  conversationId: z.string().describe('ID da conversa atual')
}
```

**No internal route** — executes locally in chat-worker:

1. Build structured metadata object: `{ type: 'FINANCIAL_INQUIRY', document, vehiclePlate, vehicleModel, inquiryDescription, collectedAt }`
2. Save to `conversation.metadata.financialInquiry` via MongoDB update
3. Call escalation logic (same as `escalateToHuman`) with reason "Duvida financeira"

**Return:** `{ success: true, message: 'Dados registrados. Um atendente especializado entrara em contato.' }`

---

#### 8. `collectInsuredAssetData`

**File:** `apps/chat-worker/src/tools/collect-insured-asset-data.ts`

**Description (PT-BR):** Registra os dados do bem segurado na proposta (veiculo, imovel, vida, etc.). Use apos criar a proposta para completar os detalhes do objeto de seguro.

**Parameters:**

```typescript
{
  proposalId: z.string().describe('ID da proposta (obtido via captureLead)'),
  insuranceType: z.enum(['AUTO', 'RESIDENTIAL', 'LIFE', 'BUSINESS', 'CONDOMINIUM', 'TRAVEL']),
  data: z.record(z.unknown()).describe('Dados do bem segurado conforme o tipo de seguro')
}
```

**Expected `data` structures per type:**

**AUTO:**

```typescript
{
  vehiclePlate: string,      // Placa
  vehicleModel: string,      // Modelo
  manufacturingYear: number,  // Ano fabricacao
  modelYear: number,          // Ano modelo
  fuelType: 'FLEX' | 'GASOLINE' | 'DIESEL' | 'ELECTRIC' | 'HYBRID',
  usage: 'PERSONAL' | 'COMMERCIAL' | 'RIDESHARE',
  overnightZipCode: string,   // CEP pernoite
  isArmored: boolean
}
```

**RESIDENTIAL:**

```typescript
{
  zipCode: string,
  propertyType: 'HOUSE' | 'APARTMENT' | 'TOWNHOUSE',
  usageType: 'PRIMARY' | 'VACATION' | 'RENTAL',
  constructionMaterial: 'MASONRY' | 'WOOD' | 'MIXED' | 'STEEL',
  propertyValueInCents: number,
  hasSurveillance: boolean
}
```

**LIFE:**

```typescript
{
  profession: string,
  monthlyIncomeInCents: number,
  isSmoker: boolean,
  practicesExtremeSports: boolean,
  coverageAmountInCents: number
}
```

**BUSINESS:**

```typescript
{
  cnpj: string,
  businessType: string,       // Ramo de atividade
  zipCode: string,
  propertyType: 'OWNED' | 'RENTED',
  employeeCount: number,
  revenueInCents: number,
  hasSurveillance: boolean
}
```

**CONDOMINIUM:**

```typescript
{
  zipCode: string,
  condominiumType: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED',
  unitCount: number,
  floorCount: number,
  constructionYear: number,
  hasFireSystem: boolean,
  hasGenerator: boolean
}
```

**TRAVEL:**

```typescript
{
  destination: string,
  departureDate: string,       // YYYY-MM-DD
  returnDate: string,          // YYYY-MM-DD
  travelerCount: number,
  purpose: 'LEISURE' | 'BUSINESS' | 'STUDY',
  hasPreExistingCondition: boolean
}
```

**Internal route:** `PUT /api/internal/proposals/:id/details`

**Server behavior:** Calls `UpdateProposalDetails` use case. Saves `data` to `proposal.details` JSON field.

**Return:** `{ success: true, message: string }`

---

#### 9. `searchProposal`

**File:** `apps/chat-worker/src/tools/search-proposal.ts`

**Description (PT-BR):** Consulta propostas de seguro existentes de um cliente. Use para verificar status de cotacoes em andamento ou historico.

**Parameters:**

```typescript
{
  clientId: z.string().optional().describe('ID do cliente'),
  phone: z.string().optional().describe('Telefone do cliente (alternativa ao clientId)'),
  status: z.enum(['ACTIVE', 'LOST', 'ALL']).optional().default('ACTIVE')
    .describe('Filtro de status: ACTIVE (em andamento), LOST (perdidas), ALL (todas)')
}
// At least one of clientId or phone required
```

**Internal route:** `GET /api/internal/proposals?clientId={}&phone={}&status={}`

**Server behavior:**

1. If `phone` provided (no `clientId`): find client by phone first
2. Query proposals filtered by `clientId` + `organizationId`
3. Status mapping: `ACTIVE` = stages except LOST and POLICY_ISSUED, `LOST` = LOST stage, `ALL` = no filter
4. Order by `createdAt` desc, limit 10

**Return:**

```typescript
{
  proposals: Array<{
    id: string,
    branch: string,        // AUTO, RESIDENTIAL, etc.
    stage: string,         // CAPTURE, QUOTE, etc.
    premiumValueInCents: number | null,
    coverageStartDate: string | null,
    createdAt: string,
    clientName: string
  }>,
  total: number
}
```

---

#### 10. `searchPolicy`

**File:** `apps/chat-worker/src/tools/search-policy.ts`

**Description (PT-BR):** Consulta apolices de seguro ativas de um cliente. Use para verificar se o cliente ja possui seguro vigente, especialmente antes de registrar sinistro ou oferecer renovacao.

**Parameters:**

```typescript
{
  clientId: z.string().optional().describe('ID do cliente'),
  phone: z.string().optional().describe('Telefone do cliente (alternativa ao clientId)'),
  branch: z.enum(['AUTO', 'RESIDENTIAL', 'LIFE', 'BUSINESS', 'TRAVEL', 'CONDOMINIUM', 'OTHER']).optional()
    .describe('Filtro por ramo de seguro')
}
// At least one of clientId or phone required
```

**Internal route:** `GET /api/internal/policies?clientId={}&phone={}&branch={}`

**Server behavior:**

1. If `phone` provided (no `clientId`): find client by phone first
2. Query policies filtered by `clientId` + `organizationId` + `status: ACTIVE`
3. If `branch` provided, add filter
4. Include insurer name via relation
5. Order by `endDate` desc, limit 10

**Return:**

```typescript
{
  policies: Array<{
    id: string,
    policyNumber: string,
    branch: string,
    status: 'ACTIVE',
    startDate: string,
    endDate: string,
    premiumValueInCents: number,
    insurerName: string | null
  }>,
  total: number
}
```

---

## Internal Routes Summary

| Method | Route                                 | Handler                      | Use Case(s)                                  | New?    |
| ------ | ------------------------------------- | ---------------------------- | -------------------------------------------- | ------- |
| `POST` | `/api/internal/leads`                 | `create-lead.ts`             | CreateClient + CreateProposal                | Exists  |
| `GET`  | `/api/internal/clients/search`        | `search-clients.ts`          | ListClients (filtered by phone/documentHash) | **New** |
| `PUT`  | `/api/internal/clients/:id`           | `update-client.ts`           | UpdateClient (partial)                       | **New** |
| `POST` | `/api/internal/claims`                | `create-claim.ts`            | SearchClient + ListPolicies + CreateClaim    | **New** |
| `GET`  | `/api/internal/proposals`             | `list-proposals.ts`          | ListProposals (filtered)                     | **New** |
| `GET`  | `/api/internal/policies`              | `list-policies.ts`           | ListPolicies (filtered)                      | **New** |
| `PUT`  | `/api/internal/proposals/:id/details` | `update-proposal-details.ts` | UpdateProposalDetails                        | **New** |

All routes use the existing HMAC middleware (`validateInternalSignature`) from `apps/server/src/routes/internal/`.

## AI Bot Processor Changes

### Tool Registration

`apps/chat-worker/src/processors/ai-bot-processor.ts`:

- Register all 10 tools (3 renamed + 7 new; `listProducts` replaces `consultarProdutos`) via `generateWithTools()`
- Bump `maxSteps` from 5 to 10 (complex flows chain 4-5 tools)
- Pass `conversationId` and `tenantId` as closure context to tools that need it

### System Prompt Update

`apps/chat-worker/src/processors/ai-bot-helpers.ts`:

- Update `buildSystemPrompt()` to reference English tool names
- Add guidance for new tools (when to use each)
- Keep tool usage instructions in PT-BR (matches conversation language)

### Agent Prompt Update

`agents/prompt.md`:

- Reference tool names in English
- Add flow instructions that leverage all tools
- Example flows for each of the 4 paths (quote, urgency, financial, human handoff)

## Flow Examples

### Complete Quote Flow (Cotacao)

```
1. Client: "Quero fazer um seguro do meu carro"
2. Bot calls listProducts({ insuranceType: 'AUTO' }) → explains coverages
3. Bot calls searchClient({ phone: <from contact> }) → checks if client exists
4. If not found: Bot collects name → calls captureLead({ clientName, insuranceType: 'AUTO' })
5. Bot collects CPF → calls updateClientData({ clientId, document })
6. Bot collects vehicle data → calls collectInsuredAssetData({ proposalId, insuranceType: 'AUTO', data: {...} })
7. Bot summarizes and confirms
```

### Urgency Flow (Sinistro)

```
1. Client: "Bateram no meu carro"
2. Bot provides emergency numbers (SAMU 192, PM 190, PRF 191, broker 83 99650-6501)
3. Bot collects description, date, location
4. Bot calls reportClaim({ phoneOrDocument: <phone>, description, incidentDate, insuranceType: 'AUTO', conversationId })
5a. If policy found → Claim created, bot confirms number
5b. If no policy → Data saved, bot escalates to human
```

### Financial Flow

```
1. Client: "Preciso do boleto do meu seguro"
2. Bot collects CPF
3. Bot asks if auto insurance → collects plate + model
4. Bot calls registerFinancialInquiry({ document, vehiclePlate, vehicleModel, inquiryDescription, conversationId })
5. Bot confirms human agent will follow up
```

### Human Handoff

```
1. Client: "Quero falar com uma pessoa"
2. Bot calls escalateToHuman({ reason: 'Cliente solicitou atendimento humano' })
3. Bot confirms transfer
```

## Out of Scope

- Tenant-specific product catalog (future ERP feature)
- Payment processing / boleto generation
- Document upload via chat (existing Document module, separate flow)
- Automated quote pricing (requires insurer API integrations)
- WhatsApp template messages for proactive contact
