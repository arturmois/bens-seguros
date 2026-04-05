# AI Agent Tool Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow per-agent configuration of which AI tools are enabled, with all tools disabled by default and `escalateToHuman` always mandatory.

**Architecture:** Add `enabledTools: string[]` allowlist field to the `AiAgent` MongoDB model. Create a tool registry in `chat-worker` as the single source of truth for configurable tool metadata. Expose the registry via a new API endpoint. Filter tools in the bot processor before passing to the AI SDK. Add a collapsible "Ferramentas" section in the agent form UI with switches per tool.

**Tech Stack:** MongoDB/Mongoose, Fastify + Zod, React Hook Form, shadcn/ui (Switch, Collapsible), TanStack Query

---

### Task 1: Tool Registry

**Files:**

- Create: `apps/chat-worker/src/tools/tool-registry.ts`

- [ ] **Step 1: Create the tool registry file**

```typescript
// apps/chat-worker/src/tools/tool-registry.ts

export const MANDATORY_TOOLS = ['escalateToHuman'] as const

export interface ToolRegistryEntry {
  readonly name: string
  readonly label: string
  readonly description: string
}

export const TOOL_REGISTRY: readonly ToolRegistryEntry[] = [
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

- [ ] **Step 2: Commit**

```bash
git add apps/chat-worker/src/tools/tool-registry.ts
git commit -m "feat: add AI agent tool registry with metadata"
```

---

### Task 2: Add `enabledTools` to MongoDB Model

**Files:**

- Modify: `packages/db-chat/src/models/ai-agent.model.ts`

- [ ] **Step 1: Add the `enabledTools` field to the schema**

In `packages/db-chat/src/models/ai-agent.model.ts`, add after the `isActive` field:

```typescript
    enabledTools: { type: [String], default: [] },
```

The full schema should now look like:

```typescript
const aiAgentSchema = new Schema(
  {
    tenantId: { type: String, required: true },
    name: { type: String, required: true, maxlength: 100 },
    description: { type: String, default: null, maxlength: 300 },
    systemPrompt: {
      type: String,
      default:
        'Voce e um assistente de uma corretora de seguros. Responda de forma educada e profissional em portugues brasileiro.',
    },
    provider: { type: String, enum: ['claude', 'openai'], default: 'claude' },
    temperature: { type: Number, default: 0.7 },
    maxTokens: { type: Number, default: 500 },
    maxResponsesPerConversation: { type: Number, default: 20 },
    isActive: { type: Boolean, default: false },
    enabledTools: { type: [String], default: [] },
  },
  { timestamps: true }
)
```

- [ ] **Step 2: Commit**

```bash
git add packages/db-chat/src/models/ai-agent.model.ts
git commit -m "feat: add enabledTools field to AiAgent model"
```

---

### Task 3: API — Available Tools Endpoint + Schema Validation

**Files:**

- Modify: `apps/chat-server/src/infra/http/routes/ai-agent-schemas.ts`
- Modify: `apps/chat-server/src/infra/http/routes/ai-agent-routes.ts`

- [ ] **Step 1: Add `enabledTools` to Zod schemas and create tool registry for validation**

In `apps/chat-server/src/infra/http/routes/ai-agent-schemas.ts`, add at the top after imports:

```typescript
const CONFIGURABLE_TOOL_NAMES = [
  'listProducts',
  'captureLead',
  'searchClient',
  'updateClientData',
  'reportClaim',
  'registerFinancialInquiry',
  'collectInsuredAssetData',
  'searchProposal',
  'searchPolicy',
] as const

const AVAILABLE_TOOLS = [
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

export { AVAILABLE_TOOLS }
```

Then add `enabledTools` to `createAgentBodySchema`:

```typescript
export const createAgentBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).nullable().optional(),
  systemPrompt: z.string().max(2000).optional(),
  provider: z.enum(['claude', 'openai']).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(2000).optional(),
  maxResponsesPerConversation: z.number().min(5).max(100).optional(),
  isActive: z.boolean().optional(),
  enabledTools: z.array(z.enum(CONFIGURABLE_TOOL_NAMES)).optional().default([]),
})
```

Note: `updateAgentBodySchema` already derives from `createAgentBodySchema.partial()` so it will pick up the new field automatically.

- [ ] **Step 2: Add the `GET /chat/ai-agents/available-tools` route**

In `apps/chat-server/src/infra/http/routes/ai-agent-routes.ts`, add this import:

```typescript
import {
  agentIdSchema,
  AVAILABLE_TOOLS,
  createAgentBodySchema,
  getLinkedChannels,
  mapAgent,
  updateAgentBodySchema,
} from './ai-agent-schemas'
```

Then add this route **before** the `GET /chat/ai-agents/:id` route (to avoid `:id` catching `available-tools`):

```typescript
app.get(
  '/chat/ai-agents/available-tools',
  async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ success: true, data: AVAILABLE_TOOLS })
  }
)
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm --filter @app/chat-server exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/chat-server/src/infra/http/routes/ai-agent-schemas.ts apps/chat-server/src/infra/http/routes/ai-agent-routes.ts
git commit -m "feat: add enabledTools validation and available-tools endpoint"
```

---

### Task 4: Filter Tools in Bot Processor

**Files:**

- Modify: `apps/chat-worker/src/processors/ai-bot-processor.ts`
- Modify: `apps/chat-worker/src/processors/ai-bot-helpers.ts`

- [ ] **Step 1: Add `enabledTools` to the `AiAgentConfig` interface and `getAiAgentConfig`**

In `apps/chat-worker/src/processors/ai-bot-helpers.ts`, update the `AiAgentConfig` interface:

```typescript
export interface AiAgentConfig {
  systemPrompt: string
  provider: AIProvider
  temperature: number
  maxTokens: number
  maxResponsesPerConversation: number
  enabledTools: string[]
}
```

In `getAiAgentConfig`, add the `enabledTools` extraction:

```typescript
export function getAiAgentConfig(doc: Record<string, unknown>): AiAgentConfig {
  return {
    systemPrompt:
      typeof doc['systemPrompt'] === 'string'
        ? doc['systemPrompt']
        : DEFAULT_SYSTEM_PROMPT,
    provider: doc['provider'] === 'openai' ? 'openai' : 'claude',
    temperature:
      typeof doc['temperature'] === 'number' ? doc['temperature'] : 0.7,
    maxTokens: typeof doc['maxTokens'] === 'number' ? doc['maxTokens'] : 300,
    maxResponsesPerConversation:
      typeof doc['maxResponsesPerConversation'] === 'number'
        ? doc['maxResponsesPerConversation']
        : CHAT_LIMITS.MAX_AI_RESPONSES_PER_CONVERSATION,
    enabledTools: Array.isArray(doc['enabledTools'])
      ? (doc['enabledTools'] as string[])
      : [],
  }
}
```

- [ ] **Step 2: Make `buildSystemPrompt` dynamic based on enabled tools**

Update `buildSystemPrompt` signature to accept enabled tool names and only list those + `escalateToHuman`:

```typescript
const TOOL_PROMPT_DESCRIPTIONS: Record<string, string> = {
  escalateToHuman:
    'transferir para atendente humano (cliente pediu, tema sensivel, voce nao consegue resolver)',
  listProducts: 'listar tipos de seguro com coberturas e dados necessarios',
  captureLead: 'registrar interesse do cliente em um seguro e criar proposta',
  searchClient:
    'buscar cliente por telefone ou CPF/CNPJ (verificar se ja tem cadastro)',
  updateClientData:
    'atualizar dados cadastrais (CPF, email, endereco, nascimento)',
  reportClaim:
    'registrar sinistro/urgencia (cria no sistema se tiver apolice, senao salva e transfere)',
  registerFinancialInquiry:
    'registrar duvida financeira e transferir para especialista',
  collectInsuredAssetData:
    'salvar dados do bem segurado na proposta (veiculo, imovel, etc.)',
  searchProposal: 'consultar propostas existentes do cliente',
  searchPolicy: 'consultar apolices ativas do cliente',
}

export function buildSystemPrompt(
  contactName: string,
  channelName: string,
  customPrompt?: string,
  enabledTools: string[] = []
): string {
  const base = customPrompt ?? DEFAULT_SYSTEM_PROMPT

  const activeToolNames = ['escalateToHuman', ...enabledTools]
  const toolLines = activeToolNames
    .filter((name) => TOOL_PROMPT_DESCRIPTIONS[name])
    .map((name) => `- ${name}: ${TOOL_PROMPT_DESCRIPTIONS[name]}`)

  return [
    base,
    '',
    'Contexto adicional:',
    `- Voce esta conversando com: ${contactName}`,
    `- Voce esta atendendo pelo canal: ${channelName}`,
    '',
    'Ferramentas disponiveis e quando usar:',
    ...toolLines,
    '',
    'Regras:',
    '- Responda de forma concisa e natural, como em uma conversa de WhatsApp',
    '- Use searchClient no inicio para verificar se o cliente ja e cadastrado',
    '- Colete dados um de cada vez, nao peca tudo de uma so vez',
    '- Sempre confirme os dados antes de registrar',
  ].join('\n')
}
```

- [ ] **Step 3: Filter tools in the processor and pass `enabledTools` to `buildSystemPrompt`**

In `apps/chat-worker/src/processors/ai-bot-processor.ts`, add the import:

```typescript
import { MANDATORY_TOOLS } from '../tools/tool-registry.js'
```

Then, after the `tools` object is built (line ~150), add the filtering:

```typescript
const tools = {
  [ESCALATION_TOOL_NAME]: createEscalateToHumanTool(
    conversationId,
    tenantId,
    pubsubClient
  ),
  listProducts: createListProductsTool(),
  captureLead: createCaptureLeadTool(tenantId, contactPhone),
  searchClient: createSearchClientTool(tenantId),
  updateClientData: createUpdateClientDataTool(tenantId),
  reportClaim: createReportClaimTool(conversationId, tenantId, pubsubClient),
  registerFinancialInquiry: createRegisterFinancialInquiryTool(
    conversationId,
    tenantId,
    pubsubClient
  ),
  collectInsuredAssetData: createCollectInsuredAssetDataTool(tenantId),
  searchProposal: createSearchProposalTool(tenantId),
  searchPolicy: createSearchPolicyTool(tenantId),
}

const filteredTools = Object.fromEntries(
  Object.entries(tools).filter(
    ([name]) =>
      MANDATORY_TOOLS.includes(name as (typeof MANDATORY_TOOLS)[number]) ||
      config.enabledTools.includes(name)
  )
)
```

Update the `buildSystemPrompt` call to pass `enabledTools`:

```typescript
const systemPrompt = buildSystemPrompt(
  contactName,
  channelName,
  config.systemPrompt,
  config.enabledTools
)
```

Update the `generateWithTools` call to use `filteredTools`:

```typescript
result = await generateWithTools({
  systemPrompt,
  messages,
  tools: filteredTools,
  provider: config.provider,
  maxTokens: config.maxTokens,
  temperature: config.temperature,
  maxSteps: 10,
})
```

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm --filter @app/chat-worker exec tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/chat-worker/src/processors/ai-bot-helpers.ts apps/chat-worker/src/processors/ai-bot-processor.ts
git commit -m "feat: filter AI tools by agent enabledTools config"
```

---

### Task 5: Frontend Types and Schema

**Files:**

- Modify: `apps/web/src/features/ai-agents/types/index.ts`
- Modify: `apps/web/src/features/ai-agents/lib/schemas.ts`

- [ ] **Step 1: Add `enabledTools` to frontend types**

In `apps/web/src/features/ai-agents/types/index.ts`, add the `AvailableTool` interface and update existing types:

```typescript
export interface AvailableTool {
  readonly name: string
  readonly label: string
  readonly description: string
}

export interface AiAgentData {
  readonly id: string
  readonly tenantId: string
  readonly name: string
  readonly description: string | null
  readonly systemPrompt: string
  readonly provider: 'claude' | 'openai'
  readonly temperature: number
  readonly maxTokens: number
  readonly maxResponsesPerConversation: number
  readonly isActive: boolean
  readonly enabledTools: string[]
  readonly linkedChannelCount: number
  readonly createdAt: string
  readonly updatedAt: string
}

export interface AiAgentDetail extends AiAgentData {
  readonly linkedChannels: ReadonlyArray<{
    readonly id: string
    readonly name: string
  }>
}

export interface CreateAiAgentPayload {
  readonly name: string
  readonly description?: string | null
  readonly systemPrompt?: string
  readonly provider?: 'claude' | 'openai'
  readonly temperature?: number
  readonly maxTokens?: number
  readonly maxResponsesPerConversation?: number
  readonly isActive?: boolean
  readonly enabledTools?: string[]
}

export interface UpdateAiAgentPayload extends Partial<CreateAiAgentPayload> {}
```

- [ ] **Step 2: Add `enabledTools` to the form schema**

In `apps/web/src/features/ai-agents/lib/schemas.ts`, add `enabledTools` to `aiAgentFormSchema`:

```typescript
export const aiAgentFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z.string().max(300, 'Descrição muito longa').optional(),
  systemPrompt: z
    .string()
    .max(2000, 'Prompt deve ter no máximo 2000 caracteres')
    .optional(),
  provider: z.enum(['claude', 'openai']),
  temperature: z.coerce.number().min(0).max(1),
  maxTokens: z.coerce.number().min(100).max(2000),
  maxResponsesPerConversation: z.coerce.number().min(5).max(100),
  isActive: z.boolean(),
  enabledTools: z.array(z.string()).default([]),
})
```

Update `DEFAULT_AGENT_FORM`:

```typescript
export const DEFAULT_AGENT_FORM: AiAgentFormValues = {
  name: '',
  description: '',
  systemPrompt: '',
  provider: 'claude',
  temperature: 0.7,
  maxTokens: 500,
  maxResponsesPerConversation: 20,
  isActive: false,
  enabledTools: [],
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/ai-agents/types/index.ts apps/web/src/features/ai-agents/lib/schemas.ts
git commit -m "feat: add enabledTools to frontend types and form schema"
```

---

### Task 6: Frontend Hook for Available Tools

**Files:**

- Modify: `apps/web/src/features/ai-agents/hooks/use-ai-agents.ts`

- [ ] **Step 1: Add `useAvailableTools` hook**

In `apps/web/src/features/ai-agents/hooks/use-ai-agents.ts`, add the import and the new hook:

Add to imports:

```typescript
import type {
  AiAgentData,
  AiAgentDetail,
  AvailableTool,
  CreateAiAgentPayload,
  UpdateAiAgentPayload,
} from '../types'
```

Add the hook after `useAiAgent`:

```typescript
const AVAILABLE_TOOLS_KEY = 'ai-agents-available-tools'

export function useAvailableTools() {
  return useQuery({
    queryKey: [AVAILABLE_TOOLS_KEY],
    queryFn: async () => {
      const response = await chatApi.get<AvailableTool[]>(
        '/chat/ai-agents/available-tools'
      )
      return response.data
    },
    staleTime: 300_000,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/ai-agents/hooks/use-ai-agents.ts
git commit -m "feat: add useAvailableTools hook"
```

---

### Task 7: Frontend — Tools Toggle Section in Agent Form

**Files:**

- Modify: `apps/web/src/features/ai-agents/components/ai-agent-form-parts.tsx`
- Modify: `apps/web/src/features/ai-agents/components/ai-agent-form-sheet.tsx`

- [ ] **Step 1: Create the `ToolsToggleSection` component**

In `apps/web/src/features/ai-agents/components/ai-agent-form-parts.tsx`, add the necessary imports at the top:

```typescript
import { ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from '@/components/ui/collapsible'
```

Also add `UseFormSetValue` to the react-hook-form import:

```typescript
import type {
  Control,
  UseFormRegister,
  FieldErrors,
  UseFormSetValue,
} from 'react-hook-form'
```

And add the `AvailableTool` import:

```typescript
import type { AvailableTool } from '../types'
```

Then add the component at the bottom of the file:

```typescript
interface ToolsToggleSectionProps {
  readonly availableTools: readonly AvailableTool[]
  readonly enabledTools: string[]
  readonly setValue: UseFormSetValue<AiAgentFormValues>
  readonly defaultOpen?: boolean
}

export function ToolsToggleSection({
  availableTools,
  enabledTools,
  setValue,
  defaultOpen = false,
}: ToolsToggleSectionProps) {
  function handleToggle(toolName: string, enabled: boolean) {
    if (enabled) {
      setValue('enabledTools', [...enabledTools, toolName], {
        shouldDirty: true,
      })
      return
    }
    setValue(
      'enabledTools',
      enabledTools.filter((t) => t !== toolName),
      { shouldDirty: true }
    )
  }

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="border-border flex w-full items-center justify-between rounded-lg border p-4">
        <span className="text-sm font-medium">
          Ferramentas ({enabledTools.length}/{availableTools.length})
        </span>
        <ChevronDown className="text-muted-foreground size-4 transition-transform [[data-panel-open]_&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="space-y-1 pt-2">
          <p className="text-muted-foreground px-1 text-xs">
            Selecione as ferramentas que este agente pode utilizar durante as
            conversas. A transferência para atendente humano está sempre
            disponível.
          </p>
          <div className="space-y-1 pt-2">
            {availableTools.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center justify-between rounded-md px-1 py-2"
              >
                <div className="space-y-0.5">
                  <Label htmlFor={`tool-${tool.name}`} className="cursor-pointer text-sm">
                    {tool.label}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {tool.description}
                  </p>
                </div>
                <Switch
                  id={`tool-${tool.name}`}
                  checked={enabledTools.includes(tool.name)}
                  onCheckedChange={(checked) =>
                    handleToggle(tool.name, checked)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  )
}
```

- [ ] **Step 2: Wire up the `ToolsToggleSection` in the form sheet**

In `apps/web/src/features/ai-agents/components/ai-agent-form-sheet.tsx`, add the import:

```typescript
import {
  ActiveToggle,
  AiAgentNumericFields,
  AiAgentProviderSelect,
  LinkedChannelsSection,
  ToolsToggleSection,
} from './ai-agent-form-parts'
```

Add the hook import:

```typescript
import {
  useAiAgent,
  useAvailableTools,
  useCreateAiAgent,
  useUpdateAiAgent,
} from '../hooks/use-ai-agents'
```

Inside the `AiAgentFormSheet` component, add the hook call:

```typescript
const availableTools = useAvailableTools()
```

Update the `form.reset` calls to include `enabledTools`. In the `useEffect`, update the agent branch:

```typescript
if (agent) {
  form.reset({
    name: agent.name,
    description: agent.description ?? '',
    systemPrompt: agent.systemPrompt ?? '',
    provider: agent.provider,
    temperature: agent.temperature,
    maxTokens: agent.maxTokens,
    maxResponsesPerConversation: agent.maxResponsesPerConversation,
    isActive: agent.isActive,
    enabledTools: agent.enabledTools ?? [],
  })
  return
}
```

And update the `defaultValues` in `useForm`:

```typescript
    defaultValues: agent
      ? {
          name: agent.name,
          description: agent.description ?? '',
          systemPrompt: agent.systemPrompt ?? '',
          provider: agent.provider,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          maxResponsesPerConversation: agent.maxResponsesPerConversation,
          isActive: agent.isActive,
          enabledTools: agent.enabledTools ?? [],
        }
      : DEFAULT_AGENT_FORM,
```

Then add the `ToolsToggleSection` in the form JSX, after `AiAgentNumericFields` and before the `Controller` for `isActive`:

```tsx
{
  availableTools.data && (
    <ToolsToggleSection
      availableTools={availableTools.data}
      enabledTools={form.watch('enabledTools')}
      setValue={form.setValue}
      defaultOpen={isEditMode}
    />
  )
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 4: Verify lint passes**

Run: `pnpm lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/ai-agents/components/ai-agent-form-parts.tsx apps/web/src/features/ai-agents/components/ai-agent-form-sheet.tsx
git commit -m "feat: add tools toggle section to AI agent form"
```

---

### Task 8: Full Quality Gates

- [ ] **Step 1: Run lint**

Run: `pnpm lint`
Expected: No errors

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Successful build

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 5: Manual QA**

Start the dev server (`pnpm dev`) and verify:

1. Navigate to Settings > Agentes IA
2. Create a new agent — confirm all tools are OFF by default
3. Enable 3 tools (e.g., `searchClient`, `listProducts`, `captureLead`), save
4. Re-open the agent — confirm the 3 tools are still ON
5. Disable one tool, save, re-open — confirm the change persisted
6. `GET /chat/ai-agents/available-tools` returns 9 tools (no `escalateToHuman`)
