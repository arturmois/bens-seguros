# AI Agent Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 10 AI agent tools (3 renamed + 7 new) so the insurance chatbot can handle quotes, urgency, financial inquiries, and handoff end-to-end.

**Architecture:** Tools live in `apps/chat-worker/src/tools/` and call `apps/server` internal HMAC-authenticated routes. One exception: `registerFinancialInquiry` operates locally on MongoDB. All code identifiers are English; tool descriptions are PT-BR.

**Tech Stack:** Vercel AI SDK `tool()`, Zod schemas, Fastify internal routes, Prisma queries, Mongoose (Conversation metadata), HMAC signing via `@repo/shared`.

**Spec:** `docs/superpowers/specs/2026-04-04-ai-agent-tools-design.md`

---

## File Map

### chat-worker tools (create/modify)

| File                                                       | Action                                         | Responsibility                                   |
| ---------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `apps/chat-worker/src/tools/escalate-to-human.ts`          | **Create** (replaces `escalar-para-humano.ts`) | Handoff to human agent                           |
| `apps/chat-worker/src/tools/list-products.ts`              | **Create** (replaces `consultar-produtos.ts`)  | Enriched insurance product catalog               |
| `apps/chat-worker/src/tools/capture-lead.ts`               | **Create** (replaces `captar-lead.ts`)         | Lead capture + proposal creation                 |
| `apps/chat-worker/src/tools/search-client.ts`              | **Create**                                     | Find client by phone/document                    |
| `apps/chat-worker/src/tools/update-client-data.ts`         | **Create**                                     | Update client profile data                       |
| `apps/chat-worker/src/tools/report-claim.ts`               | **Create**                                     | Register claim (hybrid: create or save metadata) |
| `apps/chat-worker/src/tools/register-financial-inquiry.ts` | **Create**                                     | Save financial inquiry + escalate                |
| `apps/chat-worker/src/tools/collect-insured-asset-data.ts` | **Create**                                     | Save insured object details to proposal          |
| `apps/chat-worker/src/tools/search-proposal.ts`            | **Create**                                     | Query client proposals                           |
| `apps/chat-worker/src/tools/search-policy.ts`              | **Create**                                     | Query client active policies                     |
| `apps/chat-worker/src/tools/escalar-para-humano.ts`        | **Delete**                                     | Replaced by `escalate-to-human.ts`               |
| `apps/chat-worker/src/tools/consultar-produtos.ts`         | **Delete**                                     | Replaced by `list-products.ts`                   |
| `apps/chat-worker/src/tools/captar-lead.ts`                | **Delete**                                     | Replaced by `capture-lead.ts`                    |

### chat-worker processor (modify)

| File                                                  | Action     | Responsibility                           |
| ----------------------------------------------------- | ---------- | ---------------------------------------- |
| `apps/chat-worker/src/processors/ai-bot-processor.ts` | **Modify** | Register all 10 tools, bump maxSteps     |
| `apps/chat-worker/src/processors/ai-bot-helpers.ts`   | **Modify** | Update tool name constant, system prompt |

### server internal routes (create)

| File                                                               | Action     | Responsibility                      |
| ------------------------------------------------------------------ | ---------- | ----------------------------------- |
| `apps/server/src/routes/internal/leads/search-clients.ts`          | **Create** | Search client by phone/documentHash |
| `apps/server/src/routes/internal/leads/update-client.ts`           | **Create** | Partial update client data          |
| `apps/server/src/routes/internal/leads/create-claim.ts`            | **Create** | Hybrid claim creation               |
| `apps/server/src/routes/internal/leads/list-proposals.ts`          | **Create** | List proposals by client            |
| `apps/server/src/routes/internal/leads/list-policies.ts`           | **Create** | List active policies by client      |
| `apps/server/src/routes/internal/leads/update-proposal-details.ts` | **Create** | Update proposal insured object      |
| `apps/server/src/routes/internal/leads/_schemas.ts`                | **Modify** | Add schemas for new routes          |
| `apps/server/src/routes/internal/leads/index.ts`                   | **Modify** | Register new routes                 |

### agent prompt (modify)

| File               | Action     | Responsibility                                      |
| ------------------ | ---------- | --------------------------------------------------- |
| `agents/prompt.md` | **Modify** | Reference English tool names, add flow instructions |

---

## Task 1: Rename existing tools to English

Rename all 3 existing tools: file names, function names, parameter names, tool names. The old PT-BR files are deleted and replaced with English equivalents.

**Files:**

- Delete: `apps/chat-worker/src/tools/escalar-para-humano.ts`
- Delete: `apps/chat-worker/src/tools/consultar-produtos.ts`
- Delete: `apps/chat-worker/src/tools/captar-lead.ts`
- Create: `apps/chat-worker/src/tools/escalate-to-human.ts`
- Create: `apps/chat-worker/src/tools/capture-lead.ts`
- Modify: `apps/chat-worker/src/processors/ai-bot-processor.ts`
- Modify: `apps/chat-worker/src/processors/ai-bot-helpers.ts`

- [ ] **Step 1: Create `escalate-to-human.ts`**

Create `apps/chat-worker/src/tools/escalate-to-human.ts`. Same logic as `escalar-para-humano.ts` but with English identifiers:

- Factory: `createEscalateToHumanTool(conversationId, tenantId, pubsubClient)`
- Parameter: `reason` (was `motivo`)
- Return: `{ transferred: boolean, reason: string }`
- Imports: `tool` from 'ai', `z` from 'zod', `Conversation, Message` from '@repo/db-chat', `CHAT_PUBSUB_CHANNELS` from '@repo/shared', `PubsubClient` from '../types/pubsub-client.js'
- Description stays PT-BR: 'Transfere o atendimento para um atendente humano...'
- Execute: same logic — check status is BOT_ACTIVE, update to WAITING_HUMAN, create SYSTEM message, publish update

- [ ] **Step 2: Create `capture-lead.ts`**

Create `apps/chat-worker/src/tools/capture-lead.ts`. Same logic as `captar-lead.ts` but with English identifiers:

- Factory: `createCaptureLeadTool(tenantId, contactPhone)`
- Parameters: `clientName` (was `nomeCliente`), `insuranceType` (was `tipoSeguro`, values: 'AUTO','LIFE','RESIDENTIAL','BUSINESS','TRAVEL','OTHER'), `details` (was `detalhes`)
- Imports: `tool` from 'ai', `z` from 'zod', `pino`, `env` from '@repo/env', `signRequest` from '@repo/shared'
- Logger name: 'capture-lead-tool'
- FETCH_TIMEOUT_MS = 10_000
- Execute: same HTTP call to POST /api/internal/leads with HMAC signing. Body field names stay the same (they match the server schema): `clientName`, `clientPhone`, `insuranceType`, `notes`, `source`

- [ ] **Step 3: Delete old PT-BR tool files**

```bash
rm apps/chat-worker/src/tools/escalar-para-humano.ts
rm apps/chat-worker/src/tools/consultar-produtos.ts
rm apps/chat-worker/src/tools/captar-lead.ts
```

- [ ] **Step 4: Update imports in `ai-bot-processor.ts`**

In `apps/chat-worker/src/processors/ai-bot-processor.ts`, replace lines 7-9:

Old:

```
import { createEscalarParaHumanoTool } from '../tools/escalar-para-humano.js'
import { createConsultarProdutosTool } from '../tools/consultar-produtos.js'
import { createCaptarLeadTool } from '../tools/captar-lead.js'
```

New:

```
import { createEscalateToHumanTool } from '../tools/escalate-to-human.js'
import { createListProductsTool } from '../tools/list-products.js'
import { createCaptureLeadTool } from '../tools/capture-lead.js'
```

Replace the tools object (lines 115-128):

```
    const tools = {
      [ESCALATION_TOOL_NAME]: createEscalateToHumanTool(
        conversationId,
        tenantId,
        pubsubClient
      ),
      listProducts: createListProductsTool(),
      captureLead: createCaptureLeadTool(
        tenantId,
        typeof conversation.whatsappPhone === 'string'
          ? conversation.whatsappPhone
          : ''
      ),
    }
```

- [ ] **Step 5: Update `ai-bot-helpers.ts`**

Change `ESCALATION_TOOL_NAME` value on line 10:

```
export const ESCALATION_TOOL_NAME = 'escalateToHuman'
```

In `buildSystemPrompt()` (line 74-76), replace tool reference lines:

```
    '- Se o cliente quiser falar com um humano, use a ferramenta escalateToHuman',
    '- Se o cliente perguntar sobre seguros disponiveis, use listProducts',
    '- Se o cliente demonstrar interesse em cotar/contratar, use captureLead',
```

- [ ] **Step 6: Verify build compiles**

```bash
pnpm --filter @app/chat-worker build
```

Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/chat-worker/src/tools/ apps/chat-worker/src/processors/
git commit -m "refactor: rename AI agent tools from PT-BR to English

Rename escalarParaHumano->escalateToHuman, consultarProdutos->listProducts,
captarLead->captureLead. All identifiers and parameters now in English.
Tool descriptions remain in PT-BR for better LLM tool selection."
```

---

## Task 2: Enrich `listProducts` tool

Replace the simple hardcoded list with detailed product information including coverages and required data.

**Files:**

- Create: `apps/chat-worker/src/tools/list-products.ts`

- [ ] **Step 1: Create `list-products.ts`**

Create `apps/chat-worker/src/tools/list-products.ts`:

- Factory: `createListProductsTool()` (no dependencies)
- Import: `tool` from 'ai', `z` from 'zod'
- Define `ProductInfo` interface: `{ type, name, description, basicCoverages: string[], optionalCoverages: string[], requiredData: string[], note }`
- Define `PRODUCTS: ProductInfo[]` constant with 7 entries (AUTO, LIFE, RESIDENTIAL, BUSINESS, TRAVEL, CONDOMINIUM, OTHER)
- Parameter: `insuranceType` optional enum of all 7 types. Description: 'Tipo especifico de seguro para detalhar. Se omitido, retorna todos.'
- Execute: if `insuranceType` provided, filter to that one product; else return all
- Return: `{ products: ProductInfo[] }`

Product data for each type (all text in PT-BR without diacritics for consistency):

**AUTO**: basicCoverages: Roubo e furto, Colisao (parcial e total), Incendio, Danos a terceiros. optionalCoverages: Vidros, Carro reserva, Assistencia 24h, Protecao para acessorios. requiredData: Placa do veiculo, Modelo e ano, CPF do proprietario, CEP de pernoite, Uso do veiculo.

**LIFE**: basicCoverages: Morte natural ou acidental, Invalidez permanente total ou parcial, Assistencia funeral. optionalCoverages: Doencas graves, Diaria por internacao hospitalar, Renda por incapacidade temporaria, Dupla indenizacao por morte acidental. requiredData: CPF, Data de nascimento, Profissao, Renda mensal, Capital segurado desejado.

**RESIDENTIAL**: basicCoverages: Incendio raio e explosao, Roubo e furto qualificado, Danos eletricos, Vendaval e granizo. optionalCoverages: RC familiar, Quebra de vidros, Danos por agua, Assistencia residencial 24h. requiredData: CEP, Tipo (casa/apartamento), Tipo de uso, Material de construcao, Valor estimado.

**BUSINESS**: basicCoverages: Incendio raio e explosao, Danos eletricos, Roubo e furto qualificado, RC. optionalCoverages: Lucros cessantes, Quebra de maquinas, Seguro de vida em grupo, Assistencia empresarial 24h. requiredData: CNPJ, Ramo de atividade, CEP, Tipo de imovel, Numero de funcionarios.

**TRAVEL**: basicCoverages: Despesas medicas e hospitalares, Regresso sanitario, Traslado de corpo, Extravio de bagagem. optionalCoverages: Cancelamento de viagem, Atraso de voo, Pratica de esportes, Gestante. requiredData: Destino, Data ida e volta, Numero de viajantes, Finalidade.

**CONDOMINIUM**: basicCoverages: Incendio raio e explosao, Danos eletricos areas comuns, Vendaval e granizo, RC do condominio. optionalCoverages: Quebra de vidros areas comuns, Portoes e cercas, Equipamentos ginastica/piscina, Vida de funcionarios. requiredData: CEP, Tipo (residencial/comercial/misto), Unidades e andares, Ano construcao, Sistema contra incendio.

**OTHER**: basicCoverages: Danos materiais a terceiros, Danos corporais a terceiros, Custos de defesa judicial. optionalCoverages: RC profissional, RC empregador, RC produtos, RC ambiental. requiredData: CPF ou CNPJ, Tipo de atividade, Faturamento ou renda, Capital segurado desejado.

- [ ] **Step 2: Verify build**

```bash
pnpm --filter @app/chat-worker build
```

- [ ] **Step 3: Commit**

```bash
git add apps/chat-worker/src/tools/list-products.ts
git commit -m "feat: enrich listProducts tool with detailed coverage data

Replace simple product name list with full descriptions including
basic/optional coverages, required data, and notes for all 7
insurance types."
```

---

## Task 3: Internal route - search clients

Server-side route that searches clients by phone or document hash.

**Files:**

- Modify: `apps/server/src/routes/internal/leads/_schemas.ts`
- Create: `apps/server/src/routes/internal/leads/search-clients.ts`
- Modify: `apps/server/src/routes/internal/leads/index.ts`

- [ ] **Step 1: Add schemas to `_schemas.ts`**

Append to `apps/server/src/routes/internal/leads/_schemas.ts`:

```
export const searchClientsQuerySchema = z.object({
  phone: z.string().optional(),
  document: z.string().optional(),
})

export const searchClientsResponse = successResponse(
  z.object({
    found: z.boolean(),
    client: z
      .object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        hasActivePolicy: z.boolean(),
        activePoliciesCount: z.number(),
        openProposalsCount: z.number(),
      })
      .nullable(),
  })
)
```

- [ ] **Step 2: Create `search-clients.ts`**

Create `apps/server/src/routes/internal/leads/search-clients.ts`:

- Export: `searchClientsRoute(app: FastifyInstance)`
- Route: GET /api/internal/clients/search
- Schema: querystring `searchClientsQuerySchema`, response 200 `searchClientsResponse`, 400 `errorResponse`
- Imports: `createTenantClient` from '@repo/db/tenant', `hashDocument` from '@repo/shared', Fastify types, schemas
- Handler logic:
  1. Extract `phone`, `document` from query. Return 400 if both missing.
  2. Build where clause: `{ organizationId, deletedAt: null }` + either `documentHash: hashDocument(digits)` or `phone`
  3. `tenantPrisma.client.findFirst({ where })`
  4. If not found: return `{ found: false, client: null }`
  5. If found: count active policies `tenantPrisma.policy.count({ where: { organizationId, clientId, status: 'ACTIVE' } })` and open proposals `tenantPrisma.proposal.count({ where: { organizationId, clientId, stage: { notIn: ['LOST', 'POLICY_ISSUED'] } } })`
  6. Return `{ found: true, client: { id, name, type, email, phone, hasActivePolicy, activePoliciesCount, openProposalsCount } }`

- [ ] **Step 3: Register route in `index.ts`**

In `apps/server/src/routes/internal/leads/index.ts`, add:

- Import: `import { searchClientsRoute } from './search-clients.js'`
- Call: `searchClientsRoute(app)` inside `internalLeadRoutes`

- [ ] **Step 4: Verify build**

```bash
pnpm --filter @app/server build
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/internal/leads/
git commit -m "feat: add internal search-clients route for AI agent

GET /api/internal/clients/search - searches by phone or document hash,
returns client summary with active policy/proposal counts."
```

---

## Task 4: `searchClient` tool

Chat-worker tool that calls the new search-clients internal route.

**Files:**

- Create: `apps/chat-worker/src/tools/search-client.ts`

- [ ] **Step 1: Create `search-client.ts`**

Create `apps/chat-worker/src/tools/search-client.ts`:

- Factory: `createSearchClientTool(tenantId: string)`
- Imports: `tool` from 'ai', `z` from 'zod', `pino`, `env` from '@repo/env', `signRequest` from '@repo/shared'
- Logger: `pino({ name: 'search-client-tool' })`
- Parameters: `phone` (optional string), `document` (optional string). At least one required (validated in execute).
- Description PT-BR: 'Busca cliente cadastrado por telefone ou CPF/CNPJ. Use para verificar se o cliente ja possui cadastro, apolices ou propostas antes de coletar dados.'
- Execute:
  1. If neither phone nor document: return `{ found: false, error: 'Informe telefone ou documento' }`
  2. Check env vars. Build URLSearchParams from provided fields.
  3. GET request to `/api/internal/clients/search?${params}` with HMAC headers (method: 'GET', body: empty string '')
  4. Parse response, return `json.data` (the `{ found, client }` object)

**HMAC signing pattern for GET requests** (body is empty string):

```
const path = '/api/internal/clients/search'
const timestamp = Math.floor(Date.now() / 1000)
const signature = signRequest({
  secret: env.INTERNAL_API_SECRET,
  method: 'GET',
  path,
  tenantId,
  body: '',
  timestamp,
})
```

Fetch URL includes query params: `${env.INTERNAL_API_URL}${path}?${params.toString()}`

- [ ] **Step 2: Verify build**

```bash
pnpm --filter @app/chat-worker build
```

- [ ] **Step 3: Commit**

```bash
git add apps/chat-worker/src/tools/search-client.ts
git commit -m "feat: add searchClient tool for AI agent

Calls GET /api/internal/clients/search to find existing clients
by phone or CPF/CNPJ with policy and proposal counts."
```

---

## Task 5: Internal route - update client + `updateClientData` tool

Server route for partial client update and the corresponding chat-worker tool.

**Files:**

- Modify: `apps/server/src/routes/internal/leads/_schemas.ts`
- Create: `apps/server/src/routes/internal/leads/update-client.ts`
- Modify: `apps/server/src/routes/internal/leads/index.ts`
- Create: `apps/chat-worker/src/tools/update-client-data.ts`

- [ ] **Step 1: Add schemas to `_schemas.ts`**

Append to `apps/server/src/routes/internal/leads/_schemas.ts`:

```
export const updateClientParamsSchema = z.object({
  id: z.string().min(1),
})

export const updateClientBodySchema = z.object({
  document: z.string().optional(),
  email: z.string().email().optional(),
  address: z.object({
    zipCode: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }).optional(),
  birthDate: z.string().optional(),
  profession: z.string().optional(),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'COMMON_LAW']).optional(),
})

export const updateClientResponse = successResponse(
  z.object({ success: z.boolean(), message: z.string() })
)
```

- [ ] **Step 2: Create `update-client.ts` internal route**

Create `apps/server/src/routes/internal/leads/update-client.ts`:

- Export: `updateClientRoute(app: FastifyInstance)`
- Route: PUT /api/internal/clients/:id
- Imports: `createTenantClient` from '@repo/db/tenant', `hashDocument, encrypt, getEncryptionKey, stripNonDigits` from '@repo/shared', Fastify types, schemas
- Handler:
  1. Find existing client by id + organizationId + deletedAt null. 404 if not found.
  2. Build `updateData: Record<string, unknown>` from provided fields only
  3. If `document` provided: strip non-digits, validate length (11 or 14), encrypt with `encrypt(digits, getEncryptionKey())`, set `document` to JSON.stringify(encrypted), `documentHash` to `hashDocument(digits)`. If type is LEAD, set type to CLIENT.
  4. Map other fields: email, address, birthDate (convert to Date), profession, maritalStatus
  5. `tenantPrisma.client.update({ where: { id }, data: updateData })`
  6. Return `{ success: true, data: { success: true, message: 'Dados do cliente atualizados' } }`

- [ ] **Step 3: Register in `index.ts`**

Add import and call `updateClientRoute(app)` in `apps/server/src/routes/internal/leads/index.ts`.

- [ ] **Step 4: Create `update-client-data.ts` tool**

Create `apps/chat-worker/src/tools/update-client-data.ts`:

- Factory: `createUpdateClientDataTool(tenantId: string)`
- Imports: `tool` from 'ai', `z` from 'zod', `pino`, `env` from '@repo/env', `signRequest` from '@repo/shared'
- Parameters: `clientId` (required), `document` (optional), `email` (optional), `address` (optional object with zipCode, street, number, complement, neighborhood, city, state), `birthDate` (optional), `profession` (optional), `maritalStatus` (optional enum)
- Description PT-BR: 'Atualiza dados cadastrais do cliente (CPF, email, endereco, nascimento). Use apos identificar o cliente para completar ou corrigir informacoes.'
- Execute: PUT to `/api/internal/clients/${clientId}` with HMAC signing. Body = JSON of all provided fields except clientId.

- [ ] **Step 5: Verify build**

```bash
pnpm --filter @app/server build && pnpm --filter @app/chat-worker build
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/routes/internal/leads/ apps/chat-worker/src/tools/update-client-data.ts
git commit -m "feat: add updateClientData tool + internal update-client route

PUT /api/internal/clients/:id for partial client updates.
Promotes LEAD to CLIENT when document is provided."
```

---

## Task 6: Internal route - create claim + `reportClaim` tool

Hybrid claim creation: creates Claim if active policy found, saves metadata and escalates if not.

**Files:**

- Modify: `apps/server/src/routes/internal/leads/_schemas.ts`
- Create: `apps/server/src/routes/internal/leads/create-claim.ts`
- Modify: `apps/server/src/routes/internal/leads/index.ts`
- Create: `apps/chat-worker/src/tools/report-claim.ts`

- [ ] **Step 1: Add schemas to `_schemas.ts`**

Append to `apps/server/src/routes/internal/leads/_schemas.ts`:

```
const INSURANCE_BRANCH_VALUES = [
  'AUTO', 'RESIDENTIAL', 'LIFE', 'BUSINESS', 'TRAVEL', 'CONDOMINIUM', 'OTHER',
] as const

export const createInternalClaimBodySchema = z.object({
  phoneOrDocument: z.string().min(1),
  description: z.string().min(1),
  incidentDate: z.string().optional(),
  incidentLocation: z.string().optional(),
  insuranceType: z.enum(INSURANCE_BRANCH_VALUES).optional(),
})

export const createInternalClaimResponse = successResponse(
  z.object({
    claimCreated: z.boolean(),
    claimNumber: z.string().nullable(),
    dataSaved: z.boolean(),
    claimData: z.record(z.unknown()).nullable(),
    message: z.string(),
  })
)
```

- [ ] **Step 2: Create `create-claim.ts` internal route**

Create `apps/server/src/routes/internal/leads/create-claim.ts`:

- Export: `createInternalClaimRoute(app: FastifyInstance)`
- Route: POST /api/internal/claims
- Imports: `container, CreateClaim` from '@repo/core', `createTenantClient` from '@repo/db/tenant', `hashDocument` from '@repo/shared'
- Handler (hybrid logic):
  1. Extract body fields. Determine if `phoneOrDocument` is a document (11 or 14 digits) or phone.
  2. Find client: if document, query by `documentHash`; else by `phone`. Both with `organizationId` + `deletedAt: null`.
  3. **No client found**: return `{ claimCreated: false, claimNumber: null, dataSaved: true, claimData: { all body fields }, message: 'Cliente nao encontrado...' }`
  4. **Client found**: search active policy `tenantPrisma.policy.findFirst({ where: { organizationId, clientId, status: 'ACTIVE', ...(insuranceType ? { branch: insuranceType } : {}) }, orderBy: { endDate: 'desc' } })`
  5. **No policy**: return `{ claimCreated: false, ..., claimData: { clientId, clientName, ...body fields }, message: 'Nenhuma apolice ativa encontrada...' }`
  6. **Policy found**: `container.resolve(CreateClaim).execute({ organizationId, policyId, clientId, insurerId: policy.insurerId, priority: 'URGENT', description, incidentDate: new Date(...), incidentLocation })`. Return `{ claimCreated: true, claimNumber: 'SIN-{claimNumber}', dataSaved: false, claimData: null, message: 'Sinistro registrado...' }`

- [ ] **Step 3: Register in `index.ts`**

Add import and call `createInternalClaimRoute(app)`.

- [ ] **Step 4: Create `report-claim.ts` tool**

Create `apps/chat-worker/src/tools/report-claim.ts`:

- Factory: `createReportClaimTool(conversationId, tenantId, pubsubClient)`
- Imports: `tool` from 'ai', `z` from 'zod', `pino`, `env` from '@repo/env', `signRequest` from '@repo/shared', `Conversation` from '@repo/db-chat', `PubsubClient` type, `escalateToHuman` from '../processors/ai-bot-helpers.js'
- Parameters: `phoneOrDocument`, `description`, `incidentDate` (optional), `incidentLocation` (optional), `insuranceType` (optional enum)
- Description PT-BR: 'Registra um sinistro. Se encontrar apolice ativa do cliente, cria o sinistro no sistema. Se nao encontrar, salva os dados e transfere para um corretor...'
- Execute:
  1. POST to `/api/internal/claims` with HMAC signing
  2. Parse response. If `claimCreated: false` and `claimData` present:
     - Save to conversation metadata: `Conversation.updateOne({ _id: conversationId, tenantId }, { $set: { 'metadata.claimData': json.data.claimData } })`
     - Call `escalateToHuman(conversationId, tenantId, pubsubClient)`
     - Return `{ claimCreated: false, dataSaved: true, message }`
  3. If `claimCreated: true`: return the server response directly

- [ ] **Step 5: Verify build**

```bash
pnpm --filter @app/server build && pnpm --filter @app/chat-worker build
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/routes/internal/leads/ apps/chat-worker/src/tools/report-claim.ts
git commit -m "feat: add reportClaim tool + internal create-claim route

Hybrid claim creation: creates Claim if active policy found,
saves data to conversation metadata and escalates if not."
```

---

## Task 7: `registerFinancialInquiry` tool

Local tool - no internal route. Saves structured data to conversation metadata and escalates.

**Files:**

- Create: `apps/chat-worker/src/tools/register-financial-inquiry.ts`

- [ ] **Step 1: Create `register-financial-inquiry.ts`**

Create `apps/chat-worker/src/tools/register-financial-inquiry.ts`:

- Factory: `createRegisterFinancialInquiryTool(conversationId, tenantId, pubsubClient)`
- Imports: `tool` from 'ai', `z` from 'zod', `pino`, `Conversation` from '@repo/db-chat', `PubsubClient` type, `escalateToHuman` from '../processors/ai-bot-helpers.js'
- Parameters: `document` (required), `vehiclePlate` (optional), `vehicleModel` (optional), `inquiryDescription` (required)
- Description PT-BR: 'Registra duvida financeira do cliente (pagamento, boleto, etc.) com dados de contexto e transfere para atendente especializado...'
- Execute:
  1. Build metadata object: `{ type: 'FINANCIAL_INQUIRY', document, vehiclePlate: vehiclePlate ?? null, vehicleModel: vehicleModel ?? null, inquiryDescription, collectedAt: new Date().toISOString() }`
  2. `Conversation.updateOne({ _id: conversationId, tenantId }, { $set: { 'metadata.financialInquiry': financialInquiry } })`
  3. `await escalateToHuman(conversationId, tenantId, pubsubClient)`
  4. Return `{ success: true, message: 'Dados registrados. Um atendente especializado entrara em contato.' }`
  5. Catch errors: log and return `{ success: false, message: 'Erro ao registrar...' }`

- [ ] **Step 2: Verify build**

```bash
pnpm --filter @app/chat-worker build
```

- [ ] **Step 3: Commit**

```bash
git add apps/chat-worker/src/tools/register-financial-inquiry.ts
git commit -m "feat: add registerFinancialInquiry tool for AI agent

Saves financial inquiry data to conversation metadata in MongoDB
and escalates to human. No server route needed."
```

---

## Task 8: Internal routes - list proposals + list policies + update proposal details

Three read/update routes that several tools depend on.

**Files:**

- Modify: `apps/server/src/routes/internal/leads/_schemas.ts`
- Create: `apps/server/src/routes/internal/leads/list-proposals.ts`
- Create: `apps/server/src/routes/internal/leads/list-policies.ts`
- Create: `apps/server/src/routes/internal/leads/update-proposal-details.ts`
- Modify: `apps/server/src/routes/internal/leads/index.ts`

- [ ] **Step 1: Add schemas to `_schemas.ts`**

Append these schemas to `apps/server/src/routes/internal/leads/_schemas.ts`:

**List proposals:**

```
export const listInternalProposalsQuerySchema = z.object({
  clientId: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['ACTIVE', 'LOST', 'ALL']).optional().default('ACTIVE'),
})

export const listInternalProposalsResponse = successResponse(
  z.object({
    proposals: z.array(z.object({
      id: z.string(),
      branch: z.string(),
      stage: z.string(),
      premiumValueInCents: z.number().nullable(),
      coverageStartDate: z.coerce.date().nullable(),
      createdAt: z.coerce.date(),
      clientName: z.string(),
    })),
    total: z.number(),
  })
)
```

**List policies:**

```
export const listInternalPoliciesQuerySchema = z.object({
  clientId: z.string().optional(),
  phone: z.string().optional(),
  branch: z.enum(['AUTO','RESIDENTIAL','LIFE','BUSINESS','TRAVEL','CONDOMINIUM','OTHER']).optional(),
})

export const listInternalPoliciesResponse = successResponse(
  z.object({
    policies: z.array(z.object({
      id: z.string(),
      policyNumber: z.string(),
      branch: z.string(),
      status: z.string(),
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      premiumValueInCents: z.number(),
      insurerName: z.string().nullable(),
    })),
    total: z.number(),
  })
)
```

**Update proposal details:**

```
export const updateInternalProposalDetailsParamsSchema = z.object({
  id: z.string().min(1),
})

export const updateInternalProposalDetailsBodySchema = z.object({
  details: z.record(z.unknown()),
  premiumValueInCents: z.number().int().min(0).optional().default(0),
  commissionBasisPoints: z.number().int().min(0).optional().default(0),
})

export const updateInternalProposalDetailsResponse = successResponse(
  z.object({ success: z.boolean(), message: z.string() })
)
```

- [ ] **Step 2: Create `list-proposals.ts`**

Create `apps/server/src/routes/internal/leads/list-proposals.ts`:

- Export: `listInternalProposalsRoute(app: FastifyInstance)`
- Route: GET /api/internal/proposals
- Imports: `createTenantClient` from '@repo/db/tenant', Fastify types, schemas
- Handler:
  1. Extract `clientId`, `phone`, `status` from query. Return 400 if both clientId and phone missing.
  2. If phone provided (no clientId): find client by phone first. If not found, return empty array.
  3. Build stage filter: ACTIVE = `{ stage: { notIn: ['LOST', 'POLICY_ISSUED'] } }`, LOST = `{ stage: 'LOST' }`, ALL = no filter
  4. `tenantPrisma.proposal.findMany({ where: { organizationId, clientId, ...stageFilter }, include: { client: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 10 })`
  5. Map to response: `{ id, branch, stage, premiumValueInCents, coverageStartDate, createdAt, clientName: p.client?.name ?? '' }`

- [ ] **Step 3: Create `list-policies.ts`**

Create `apps/server/src/routes/internal/leads/list-policies.ts`:

- Export: `listInternalPoliciesRoute(app: FastifyInstance)`
- Route: GET /api/internal/policies
- Handler:
  1. Extract `clientId`, `phone`, `branch`. Return 400 if both clientId and phone missing.
  2. Resolve clientId from phone if needed (same pattern as proposals).
  3. `tenantPrisma.policy.findMany({ where: { organizationId, clientId, status: 'ACTIVE', ...(branch ? { branch } : {}) }, include: { insurer: { select: { name: true } } }, orderBy: { endDate: 'desc' }, take: 10 })`
  4. Map: `{ id, policyNumber: String(p.policyNumber), branch, status, startDate, endDate, premiumValueInCents, insurerName: p.insurer?.name ?? null }`

- [ ] **Step 4: Create `update-proposal-details.ts` internal route**

Create `apps/server/src/routes/internal/leads/update-proposal-details.ts`:

- Export: `updateInternalProposalDetailsRoute(app: FastifyInstance)`
- Route: PUT /api/internal/proposals/:id/details
- Imports: `container, UpdateProposalDetails` from '@repo/core', Fastify types, schemas
- Handler:
  1. `container.resolve(UpdateProposalDetails).execute(request.params.id, organizationId, { details: request.body.details, premiumValueInCents: request.body.premiumValueInCents, commissionBasisPoints: request.body.commissionBasisPoints })`
  2. Return `{ success: true, data: { success: true, message: 'Detalhes da proposta atualizados' } }`
  3. Catch: if error.code === 'PROPOSAL_NOT_FOUND', return 404

- [ ] **Step 5: Register all 3 routes in `index.ts`**

Update `apps/server/src/routes/internal/leads/index.ts` to import and call all route functions. The final file should register 7 routes total:

- `createLeadRoute(app)` (existing)
- `searchClientsRoute(app)` (Task 3)
- `updateClientRoute(app)` (Task 5)
- `createInternalClaimRoute(app)` (Task 6)
- `listInternalProposalsRoute(app)` (new)
- `listInternalPoliciesRoute(app)` (new)
- `updateInternalProposalDetailsRoute(app)` (new)

- [ ] **Step 6: Verify build**

```bash
pnpm --filter @app/server build
```

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/routes/internal/leads/
git commit -m "feat: add internal routes for proposals, policies, and proposal details

GET /api/internal/proposals - list client proposals with status filter.
GET /api/internal/policies - list active client policies.
PUT /api/internal/proposals/:id/details - update insured object details."
```

---

## Task 9: Remaining chat-worker tools (searchProposal, searchPolicy, collectInsuredAssetData)

Three tools that call the routes created in Task 8.

**Files:**

- Create: `apps/chat-worker/src/tools/search-proposal.ts`
- Create: `apps/chat-worker/src/tools/search-policy.ts`
- Create: `apps/chat-worker/src/tools/collect-insured-asset-data.ts`

- [ ] **Step 1: Create `search-proposal.ts`**

Create `apps/chat-worker/src/tools/search-proposal.ts`:

- Factory: `createSearchProposalTool(tenantId: string)`
- Imports: same pattern as searchClient (tool, z, pino, env, signRequest)
- Parameters: `clientId` (optional), `phone` (optional), `status` (optional enum ACTIVE/LOST/ALL, default ACTIVE)
- Description PT-BR: 'Consulta propostas de seguro existentes de um cliente...'
- Execute: GET to `/api/internal/proposals?${params}` with HMAC signing (body: ''). Return `json.data`.
- Error return: `{ proposals: [], total: 0, error: '...' }`

- [ ] **Step 2: Create `search-policy.ts`**

Create `apps/chat-worker/src/tools/search-policy.ts`:

- Factory: `createSearchPolicyTool(tenantId: string)`
- Parameters: `clientId` (optional), `phone` (optional), `branch` (optional enum: AUTO, RESIDENTIAL, LIFE, BUSINESS, TRAVEL, CONDOMINIUM, OTHER)
- Description PT-BR: 'Consulta apolices de seguro ativas de um cliente...'
- Execute: GET to `/api/internal/policies?${params}` with HMAC signing. Return `json.data`.
- Error return: `{ policies: [], total: 0, error: '...' }`

- [ ] **Step 3: Create `collect-insured-asset-data.ts`**

Create `apps/chat-worker/src/tools/collect-insured-asset-data.ts`:

- Factory: `createCollectInsuredAssetDataTool(tenantId: string)`
- Parameters: `proposalId` (required), `insuranceType` (required enum: AUTO, RESIDENTIAL, LIFE, BUSINESS, CONDOMINIUM, TRAVEL), `data` (required, `z.record(z.unknown())`)
- Description PT-BR: 'Registra os dados do bem segurado na proposta (veiculo, imovel, vida, etc.)...'
- Execute: PUT to `/api/internal/proposals/${proposalId}/details` with HMAC signing. Body: `{ details: { insuranceType, ...data }, premiumValueInCents: 0, commissionBasisPoints: 0 }`
- Return: `{ success: boolean, message: string }`

- [ ] **Step 4: Verify build**

```bash
pnpm --filter @app/chat-worker build
```

- [ ] **Step 5: Commit**

```bash
git add apps/chat-worker/src/tools/search-proposal.ts apps/chat-worker/src/tools/search-policy.ts apps/chat-worker/src/tools/collect-insured-asset-data.ts
git commit -m "feat: add searchProposal, searchPolicy, collectInsuredAssetData tools

Three tools for querying proposals/policies and saving insured
object details via internal HMAC-authenticated routes."
```

---

## Task 10: Register all tools in processor + update system prompt

Wire all 10 tools into `ai-bot-processor.ts` and update the system prompt in `ai-bot-helpers.ts`.

**Files:**

- Modify: `apps/chat-worker/src/processors/ai-bot-processor.ts`
- Modify: `apps/chat-worker/src/processors/ai-bot-helpers.ts`

- [ ] **Step 1: Update imports in `ai-bot-processor.ts`**

Replace the 3 tool imports with all 10:

```
import { createEscalateToHumanTool } from '../tools/escalate-to-human.js'
import { createListProductsTool } from '../tools/list-products.js'
import { createCaptureLeadTool } from '../tools/capture-lead.js'
import { createSearchClientTool } from '../tools/search-client.js'
import { createUpdateClientDataTool } from '../tools/update-client-data.js'
import { createReportClaimTool } from '../tools/report-claim.js'
import { createRegisterFinancialInquiryTool } from '../tools/register-financial-inquiry.js'
import { createCollectInsuredAssetDataTool } from '../tools/collect-insured-asset-data.js'
import { createSearchProposalTool } from '../tools/search-proposal.js'
import { createSearchPolicyTool } from '../tools/search-policy.js'
```

- [ ] **Step 2: Update tools object in processor**

Replace the `const tools = { ... }` block with:

```
    const contactPhone =
      typeof conversation.whatsappPhone === 'string'
        ? conversation.whatsappPhone
        : ''

    const tools = {
      [ESCALATION_TOOL_NAME]: createEscalateToHumanTool(
        conversationId, tenantId, pubsubClient
      ),
      listProducts: createListProductsTool(),
      captureLead: createCaptureLeadTool(tenantId, contactPhone),
      searchClient: createSearchClientTool(tenantId),
      updateClientData: createUpdateClientDataTool(tenantId),
      reportClaim: createReportClaimTool(conversationId, tenantId, pubsubClient),
      registerFinancialInquiry: createRegisterFinancialInquiryTool(
        conversationId, tenantId, pubsubClient
      ),
      collectInsuredAssetData: createCollectInsuredAssetDataTool(tenantId),
      searchProposal: createSearchProposalTool(tenantId),
      searchPolicy: createSearchPolicyTool(tenantId),
    }
```

- [ ] **Step 3: Bump maxSteps from 3 to 10**

In the `generateWithTools()` call, change `maxSteps: 3` to `maxSteps: 10`.

- [ ] **Step 4: Update `wasEscalated` check**

`reportClaim` and `registerFinancialInquiry` trigger escalation internally. Update the check:

```
    const escalatingTools = new Set([
      ESCALATION_TOOL_NAME,
      'reportClaim',
      'registerFinancialInquiry',
    ])
    const wasEscalated = result.toolResults.some((tr) =>
      escalatingTools.has(tr.toolName)
    )
```

- [ ] **Step 5: Update `buildSystemPrompt()` in `ai-bot-helpers.ts`**

Replace the `buildSystemPrompt` function body. The new prompt should include all 10 tools with guidance:

```
export function buildSystemPrompt(
  contactName: string,
  channelName: string,
  customPrompt?: string
): string {
  const base = customPrompt ?? DEFAULT_SYSTEM_PROMPT
  return [
    base,
    '',
    'Contexto adicional:',
    `- Voce esta conversando com: ${contactName}`,
    `- Voce esta atendendo pelo canal: ${channelName}`,
    '',
    'Ferramentas disponiveis e quando usar:',
    '- escalateToHuman: transferir para atendente humano (cliente pediu, tema sensivel, voce nao consegue resolver)',
    '- listProducts: listar tipos de seguro com coberturas e dados necessarios',
    '- captureLead: registrar interesse do cliente em um seguro e criar proposta',
    '- searchClient: buscar cliente por telefone ou CPF/CNPJ (verificar se ja tem cadastro)',
    '- updateClientData: atualizar dados cadastrais (CPF, email, endereco, nascimento)',
    '- reportClaim: registrar sinistro/urgencia (cria no sistema se tiver apolice, senao salva e transfere)',
    '- registerFinancialInquiry: registrar duvida financeira e transferir para especialista',
    '- collectInsuredAssetData: salvar dados do bem segurado na proposta (veiculo, imovel, etc.)',
    '- searchProposal: consultar propostas existentes do cliente',
    '- searchPolicy: consultar apolices ativas do cliente',
    '',
    'Regras:',
    '- Responda de forma concisa e natural, como em uma conversa de WhatsApp',
    '- Use searchClient no inicio para verificar se o cliente ja e cadastrado',
    '- Colete dados um de cada vez, nao peca tudo de uma so vez',
    '- Sempre confirme os dados antes de registrar',
  ].join('\n')
}
```

- [ ] **Step 6: Verify build**

```bash
pnpm --filter @app/chat-worker build
```

- [ ] **Step 7: Commit**

```bash
git add apps/chat-worker/src/processors/
git commit -m "feat: register all 10 AI agent tools in processor

Wire searchClient, updateClientData, reportClaim, registerFinancialInquiry,
collectInsuredAssetData, searchProposal, searchPolicy into the AI bot
processor. Bump maxSteps from 3 to 10 for multi-tool flows."
```

---

## Task 11: Update agent prompt

Update `agents/prompt.md` to reference the English tool names and provide flow guidance.

**Files:**

- Modify: `agents/prompt.md`

- [ ] **Step 1: Update `agents/prompt.md`**

Add a tools reference section at the end of the file:

```markdown
---

## Ferramentas Disponiveis

| Ferramenta                 | Quando Usar                                               |
| -------------------------- | --------------------------------------------------------- |
| `escalateToHuman`          | Cliente pede humano, tema sensivel, voce nao resolve      |
| `listProducts`             | Listar tipos de seguro com coberturas e dados necessarios |
| `searchClient`             | Verificar se cliente ja tem cadastro (inicio da conversa) |
| `captureLead`              | Registrar interesse e criar proposta de seguro            |
| `updateClientData`         | Completar CPF, email, endereco, nascimento do cliente     |
| `collectInsuredAssetData`  | Registrar dados do bem (veiculo, imovel, vida)            |
| `searchProposal`           | Verificar propostas em andamento do cliente               |
| `searchPolicy`             | Verificar apolices ativas do cliente                      |
| `reportClaim`              | Registrar sinistro (cria automatico se tiver apolice)     |
| `registerFinancialInquiry` | Registrar duvida de pagamento/boleto e transferir         |
```

Also update any references in the existing prompt sections to mention the correct tool names for each flow (urgency -> reportClaim, financial -> registerFinancialInquiry, quote -> captureLead + collectInsuredAssetData, human -> escalateToHuman).

- [ ] **Step 2: Commit**

```bash
git add agents/prompt.md
git commit -m "docs: update agent prompt with English tool references

Add tools reference table and update flow instructions to use
the new English tool names."
```

---

## Task 12: Full build verification

Verify the entire project builds and passes lint/typecheck.

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: Zero errors.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: Zero errors.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Expected: All apps and packages build successfully.

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: All existing tests pass.

---

## Summary

| Task | Description                       | Routes                           | Tools                                                 |
| ---- | --------------------------------- | -------------------------------- | ----------------------------------------------------- |
| 1    | Rename existing tools to English  | -                                | escalateToHuman, captureLead                          |
| 2    | Enrich listProducts               | -                                | listProducts                                          |
| 3    | Search clients route              | GET /api/internal/clients/search | -                                                     |
| 4    | searchClient tool                 | -                                | searchClient                                          |
| 5    | Update client route + tool        | PUT /api/internal/clients/:id    | updateClientData                                      |
| 6    | Create claim route + tool         | POST /api/internal/claims        | reportClaim                                           |
| 7    | Financial inquiry tool            | -                                | registerFinancialInquiry                              |
| 8    | Proposals/policies/details routes | 3 new routes                     | -                                                     |
| 9    | Remaining tools                   | -                                | searchProposal, searchPolicy, collectInsuredAssetData |
| 10   | Wire all tools in processor       | -                                | All 10 registered                                     |
| 11   | Update agent prompt               | -                                | -                                                     |
| 12   | Full verification                 | -                                | -                                                     |

**Total: 6 new internal routes, 10 tools (3 renamed + 7 new), 12 tasks.**
