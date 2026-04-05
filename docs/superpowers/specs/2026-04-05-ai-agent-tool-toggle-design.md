# AI Agent Tool Toggle — Design Spec

**Date:** 2026-04-05
**Status:** Draft

## Problem

All 10 AI agent tools are always active for every agent. There is no way to configure which tools an agent can use. Different agents (e.g., a quoting bot vs. a general support bot) should have different tool sets.

## Decisions

| Decision               | Choice                                                 |
| ---------------------- | ------------------------------------------------------ |
| Granularity            | Per agent (each `AiAgent` has its own tool config)     |
| Default for new agents | All tools **disabled**                                 |
| `escalateToHuman`      | Always mandatory, not toggleable, hidden from UI       |
| Storage approach       | `enabledTools: string[]` allowlist                     |
| UI placement           | Collapsible section in existing agent create/edit form |
| UI per tool            | Name (pt-BR label) + short description + switch        |

## Design

### 1. Data Model

**File:** `packages/db-chat/src/models/ai-agent.model.ts`

Add field to `AiAgent` schema:

```typescript
enabledTools: {
  type: [String],
  default: [],
}
```

- Empty array = no tools active (except `escalateToHuman`)
- Values must be valid tool names from the tool registry

### 2. Tool Registry

**New file:** `apps/chat-worker/src/tools/tool-registry.ts`

A single source of truth for all configurable tools with display metadata:

```typescript
export const MANDATORY_TOOLS = ['escalateToHuman'] as const

export const TOOL_REGISTRY = [
  {
    name: 'listProducts',
    label: 'Listar produtos',
    description: 'Lista os tipos de seguro disponíveis',
  },
  {
    name: 'captureLead',
    label: 'Capturar lead',
    description: 'Cria proposta e registra lead no sistema',
  },
  {
    name: 'searchClient',
    label: 'Buscar cliente',
    description: 'Encontra cliente por telefone ou CPF/CNPJ',
  },
  {
    name: 'updateClientData',
    label: 'Atualizar dados do cliente',
    description: 'Atualiza informações cadastrais do cliente',
  },
  {
    name: 'reportClaim',
    label: 'Registrar sinistro',
    description: 'Registra ocorrência de sinistro ou emergência',
  },
  {
    name: 'registerFinancialInquiry',
    label: 'Consulta financeira',
    description: 'Registra dúvida financeira e escala para atendente',
  },
  {
    name: 'collectInsuredAssetData',
    label: 'Coletar dados do bem',
    description: 'Salva detalhes do bem segurado para cotação',
  },
  {
    name: 'searchProposal',
    label: 'Buscar proposta',
    description: 'Encontra propostas existentes no sistema',
  },
  {
    name: 'searchPolicy',
    label: 'Buscar apólice',
    description: 'Consulta apólices ativas por cliente ou ramo',
  },
] as const

export const CONFIGURABLE_TOOL_NAMES = TOOL_REGISTRY.map((t) => t.name)
```

### 3. API Changes

**File:** `apps/chat-server/src/infra/http/routes/ai-agent-routes.ts`

#### New endpoint

`GET /chat/ai-agents/available-tools` — returns the tool registry for the frontend.

**Response:**

```json
{
  "success": true,
  "data": [
    { "name": "listProducts", "label": "Listar produtos", "description": "Lista os tipos de seguro disponíveis" },
    ...
  ]
}
```

#### Modified endpoints

- `POST /chat/ai-agents` — accept `enabledTools: string[]` in body. Validate each value against `CONFIGURABLE_TOOL_NAMES`.
- `PUT /chat/ai-agents/:id` — same validation for `enabledTools`.
- `GET /chat/ai-agents/:id` — include `enabledTools` in response.
- `GET /chat/ai-agents` — include `enabledTools` in list response.

### 4. Tool Filtering in Processor

**File:** `apps/chat-worker/src/processors/ai-bot-processor.ts`

Before passing tools to `generateWithTools()`:

```typescript
import { MANDATORY_TOOLS } from '../tools/tool-registry'

const filteredTools = Object.fromEntries(
  Object.entries(allTools).filter(
    ([name]) =>
      MANDATORY_TOOLS.includes(name) || agent.enabledTools.includes(name)
  )
)
```

Pass `filteredTools` instead of `allTools` to `generateWithTools()`.

### 5. Dynamic System Prompt

**File:** `apps/chat-worker/src/processors/ai-bot-helpers.ts`

The "Ferramentas disponíveis e quando usar" section of the system prompt must only list tools that are in `enabledTools` + `escalateToHuman`. If no configurable tools are enabled, the section states the agent can only converse and escalate.

### 6. Frontend

#### Types

**File:** `apps/web/src/features/ai-agents/types/index.ts`

Add to `AiAgentData` and related types:

```typescript
enabledTools: string[]
```

New type:

```typescript
interface AvailableTool {
  name: string
  label: string
  description: string
}
```

#### Schema

**File:** `apps/web/src/features/ai-agents/lib/schemas.ts`

Add to `aiAgentFormSchema`:

```typescript
enabledTools: z.array(z.string()).default([])
```

Update `DEFAULT_AGENT_FORM`:

```typescript
enabledTools: []
```

#### Hook

**New hook** in `apps/web/src/features/ai-agents/hooks/use-available-tools.ts`:

```typescript
useAvailableTools() // GET /chat/ai-agents/available-tools, staleTime: 5min
```

#### UI — Collapsible "Ferramentas" section

**Location:** Inside the existing agent form component.

- Positioned below "Configurações avançadas"
- Collapsible: closed by default on create, open on edit
- Info text at top: "Selecione as ferramentas que este agente pode utilizar durante as conversas. A transferência para atendente humano está sempre disponível."
- Each tool renders as a row:
  - Switch (on/off)
  - Label (pt-BR name from registry)
  - Description (gray text below label)
- Switch on = add tool name to `enabledTools` array
- Switch off = remove tool name from `enabledTools` array

## Files to Create

| File                                          | Purpose                            |
| --------------------------------------------- | ---------------------------------- |
| `apps/chat-worker/src/tools/tool-registry.ts` | Tool metadata registry + constants |

## Files to Modify

| File                                                                        | Change                                     |
| --------------------------------------------------------------------------- | ------------------------------------------ |
| `packages/db-chat/src/models/ai-agent.model.ts`                             | Add `enabledTools: [String]` field         |
| `apps/chat-server/src/infra/http/routes/ai-agent-routes.ts`                 | New endpoint + validation on create/update |
| `apps/chat-worker/src/processors/ai-bot-processor.ts`                       | Filter tools by `enabledTools`             |
| `apps/chat-worker/src/processors/ai-bot-helpers.ts`                         | Dynamic prompt based on enabled tools      |
| `apps/web/src/features/ai-agents/types/index.ts`                            | Add `enabledTools` + `AvailableTool` type  |
| `apps/web/src/features/ai-agents/lib/schemas.ts`                            | Add `enabledTools` to schema + defaults    |
| `apps/web/src/features/ai-agents/hooks/use-available-tools.ts`              | New hook (or add to existing hooks file)   |
| `apps/web/src/features/ai-agents/components/agent-form.tsx` (or equivalent) | Add collapsible "Ferramentas" section      |
