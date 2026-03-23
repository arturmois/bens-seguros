# Design: Separar Agentes IA dos Canais

**Data:** 2026-03-23
**Status:** Aprovado
**Contexto:** As configuracoes de IA estao acopladas aos canais WhatsApp. Este design separa completamente Agentes IA em uma entidade independente com pagina propria em Settings.

---

## Problema

Hoje a configuracao de IA so existe no contexto de um canal. Para configurar IA, o usuario precisa ir em Canais > dropdown do canal > Configurar IA. Isso cria acoplamento desnecessario e impede reutilizacao de agentes entre canais.

## Decisoes

1. **Agentes IA independentes** — entidade propria, desacoplada de canais
2. **Associacao bidirecional na UI** — canal seleciona agente (dropdown), agente mostra canais vinculados (read-only)
3. **Campos atuais + nome/descricao** — YAGNI, expandir depois quando necessario
4. **DDD Light** — rotas acessam Mongoose diretamente (sem use cases/repository), consistente com o modulo atual
5. **RBAC** — mesmas permissoes de `settings:read` / `settings:manage` usadas por Canais

---

## 1. Navegacao Settings

```
Configuracoes
├── Canais          (existente — gerencia conexoes WhatsApp)
├── Agentes IA      (NOVO — gerencia agentes de inteligencia artificial)
├── Membros         (em breve)
└── Organizacao     (em breve)
```

Adicionar `'agentes-ia'` ao union type `SettingsSection` e ao array `SETTINGS_SECTIONS` em `settings-layout.tsx` com icone `Brain` (lucide-react).

**Navegacao:** Usar `searchParams` do page component (Server Component compativel no Next.js App Router). URL: `/settings?section=agentes-ia`. O `SettingsLayout` recebe a secao ativa e renderiza o componente correto. Fallback: `canais` quando param ausente.

---

## 2. Pagina "Agentes IA"

### Tabela principal

| Coluna            | Tipo        | Descricao                                          |
| ----------------- | ----------- | -------------------------------------------------- |
| Nome              | text        | Nome do agente                                     |
| Provider          | badge       | "Claude" ou "OpenAI"                               |
| Status            | badge       | Ativo / Inativo                                    |
| Canais vinculados | text/badges | Nomes dos canais que usam este agente, ou "Nenhum" |
| Acoes             | dropdown    | Editar, Duplicar, Excluir                          |

### 4 estados UI obrigatorios

- **Empty:** Ilustracao + "Nenhum agente configurado" + "Crie seu primeiro agente de IA para automatizar atendimentos" + botao "Novo Agente"
- **Loading:** Skeleton com 3 linhas placeholder
- **Error:** Alert "Erro ao carregar agentes" + botao retry
- **Success:** Tabela com dados

**Paginacao:** Nao necessaria — cardinalidade esperada baixa (< 20 agentes por tenant). Se necessario no futuro, usar cursor-based.

**Busca/filtro:** Fora de escopo.

### Acoes

- **Novo Agente:** Botao no header, abre sheet lateral
- **Editar:** Abre sheet lateral com dados preenchidos
- **Duplicar:** Cria copia com nome "Copia de {nome}" (truncado para 100 chars se necessario). Se nome ja existe, adicionar sufixo numerico " (2)", " (3)", etc. Abre sheet para editar antes de salvar.
- **Excluir:** Dialog de confirmacao. Bloqueia se agente tem canais vinculados — mostra quais canais usam no dialog. Erro `AGENT_HAS_LINKED_CHANNELS` com `{ channels: [{ id, name }] }` no body.

---

## 3. Form do Agente (Sheet lateral)

### Campos

| Campo                      | Tipo          | Obrigatorio | Validacao            | Default                    |
| -------------------------- | ------------- | ----------- | -------------------- | -------------------------- |
| Nome                       | text input    | Sim         | min 1, max 100 chars | —                          |
| Descricao                  | text input    | Nao         | max 300 chars        | —                          |
| System Prompt              | textarea      | Nao         | max 2000 chars       | prompt padrao em portugues |
| Provider                   | select        | Sim         | 'claude' \| 'openai' | 'claude'                   |
| Temperature                | number input  | Sim         | 0-1, step 0.1        | 0.7                        |
| Max Tokens                 | number input  | Sim         | 100-2000             | 500                        |
| Max Respostas por Conversa | number input  | Sim         | 5-100                | 20                         |
| Ativo                      | switch toggle | Sim         | boolean              | false                      |

**Nota:** Temperature usa number input (consistente com o form atual). Slider pode ser adicionado depois se Slider component estiver disponivel no shadcn/ui.

### Secao informativa (somente edicao)

Abaixo do form, secao "Canais vinculados" mostrando badges dos canais que usam este agente. Read-only, com link para a pagina de Canais. Dados vem do endpoint de detalhe (`GET /chat/ai-agents/:id`).

---

## 4. Mudancas na Pagina de Canais

### Adicionar ao form de edicao do canal

- **Campo "Agente IA":** Select dropdown listando agentes disponiveis do tenant + opcao "Nenhum" (que envia `aiAgentId: null`)
- Mostra nome do agente + badge de status (Ativo/Inativo)

### Remover

- Botao "Configurar IA" do dropdown de acoes na tabela de canais
- Componente `ai-agent-config-sheet.tsx` (DELETAR arquivo)
- Estado `aiConfigChannelId` e callback `handleConfigureAi` em `channels-page.tsx`
- Prop `onConfigureAi` da interface `ChannelsContent`
- Hooks `useAiAgentConfig` e `useUpdateAiAgent` de `use-channels.ts`
- Schemas e types de AI agent em `channels/lib/schemas.ts` e `channels/types/index.ts`

### Adicionar

- Campo `aiAgentId` no `updateChannelBodySchema`: `z.string().nullable().optional()`
- Campo `aiAgentId` na interface `ChannelData` e `UpdateChannelPayload`
- Hook `useAiAgents()` importado de `features/ai-agents/hooks/use-ai-agents.ts` para popular o dropdown

---

## 5. Backend

### Modelo AiAgent (MongoDB) — alteracoes

**Remover:**

- `channelId` (desacopla do canal)
- Index `{ tenantId: 1, channelId: 1 }` unique

**Adicionar:**

- `name: string` (obrigatorio, min 1, max 100)
- `description: string` (opcional, max 300)

**Index novo:** `{ tenantId: 1, name: 1 }` unique

### Modelo Channel (MongoDB) — alteracoes

**Adicionar:**

- `aiAgentId: ObjectId | null` (referencia opcional ao agente, default null)

**Nota sobre `aiUserId`:** O campo `aiUserId` existente no Channel e uma referencia ao usuario Better Auth do bot (usado para auth context no chat). E um conceito diferente de `aiAgentId` (config de comportamento do agente). Ambos coexistem.

### Novas rotas

Substituir as rotas atuais `/chat/channels/:id/ai-agent` por:

```
GET    /chat/ai-agents           -> Listar agentes do tenant (com contagem de canais vinculados)
POST   /chat/ai-agents           -> Criar agente (retorna AiAgentData completo)
GET    /chat/ai-agents/:id       -> Detalhe do agente (+ lista de canais vinculados)
PUT    /chat/ai-agents/:id       -> Atualizar agente (retorna AiAgentData completo)
DELETE /chat/ai-agents/:id       -> Deletar agente (rejeitar se tem canais vinculados)
```

**RBAC:** Todas as rotas usam `requireAbility('settings', 'manage')` para escrita (POST/PUT/DELETE) e `requireAbility('settings', 'read')` para leitura (GET). Mesmas permissoes dos Canais.

**Padrao de resposta:** Todas seguem `{ success: true, data }` | `{ success: false, error: { code, message } }`.

### Alteracao em rota existente

```
PUT /chat/channels/:id    -> aceita aiAgentId (string | null) no payload
```

Schema: `aiAgentId: z.string().nullable().optional()` adicionado ao `updateChannelBodySchema`.

### Logica de negocio

- **Criar agente:** Valida unicidade de nome por tenant. Retorna `AGENT_NAME_ALREADY_EXISTS` se duplicado.
- **Deletar agente:** Rejeita com erro `AGENT_HAS_LINKED_CHANNELS` e body `{ channels: [{ id, name }] }` se existem canais vinculados.
- **Atualizar canal com aiAgentId:** Valida que o agente existe e pertence ao mesmo tenant. Retorna `AI_AGENT_NOT_FOUND` se invalido.
- **Listar agentes:** Inclui contagem de canais vinculados via aggregation lookup ou query separada.
- **Detalhe agente:** Inclui array `linkedChannels: [{ id, name }]` com canais vinculados.

### Remover rotas antigas

```
GET    /chat/channels/:id/ai-agent    -> REMOVER
PUT    /chat/channels/:id/ai-agent    -> REMOVER
```

---

## 6. Chat Processor — alteracao critica

O `ai-bot-processor.ts` em `apps/chat-worker/src/processors/` atualmente busca o agente via:

```typescript
const aiAgent = await AiAgent.findOne({ tenantId, channelId }).lean().exec()
```

**Nova logica (two-step lookup):**

```typescript
// 1. Buscar canal para obter aiAgentId
const channel = await Channel.findOne({ _id: channelId, tenantId })
  .lean()
  .exec()
if (!channel?.aiAgentId) {
  // Sem agente configurado — escalar para humano
  return
}

// 2. Buscar agente pelo id
const aiAgent = await AiAgent.findOne({ _id: channel.aiAgentId, tenantId })
  .lean()
  .exec()
if (!aiAgent || !aiAgent.isActive) {
  // Agente nao encontrado ou inativo — escalar para humano
  return
}
```

**Race condition:** Se um agente e desativado/deletado enquanto o processor esta em execucao, o processor ja tem o agente em memoria e completara a resposta atual. A proxima mensagem fara o lookup novamente e encontrara o agente inativo/ausente, escalando para humano. Comportamento aceitavel — nao requer lock.

---

## 7. Frontend — nova feature

### Estrutura de arquivos

```
features/
|-- channels/                          (existente)
|   |-- components/
|   |   |-- channels-page.tsx          (remover state aiConfig, prop onConfigureAi)
|   |   |-- channels-table.tsx         (remover acao "Configurar IA")
|   |   |-- channel-form-sheet.tsx     (adicionar select de agente)
|   |   |-- ai-agent-config-sheet.tsx  (DELETAR)
|   |   +-- ...                        (demais mantidos)
|   |-- hooks/
|   |   +-- use-channels.ts           (remover hooks de ai-agent, adicionar aiAgentId no update)
|   |-- lib/
|   |   +-- schemas.ts                (remover schemas de ai-agent, adicionar aiAgentId no channel)
|   +-- types/
|       +-- index.ts                  (remover AiAgentConfig/UpdateAiAgentPayload, adicionar aiAgentId)
|
+-- ai-agents/                         (NOVO)
    |-- components/
    |   |-- ai-agents-page.tsx         (pagina principal com 4 estados)
    |   |-- ai-agents-table.tsx        (tabela com colunas definidas)
    |   |-- ai-agent-form-sheet.tsx    (form de criar/editar)
    |   +-- delete-agent-dialog.tsx    (confirmacao de exclusao com lista de canais vinculados)
    |-- hooks/
    |   +-- use-ai-agents.ts          (CRUD hooks com React Query)
    |-- lib/
    |   +-- schemas.ts                (Zod schemas)
    +-- types/
        +-- index.ts                  (interfaces)
```

### Hooks (use-ai-agents.ts)

```
useAiAgents()                -> GET /chat/ai-agents (lista)
useAiAgent(id)               -> GET /chat/ai-agents/:id (detalhe)
useCreateAiAgent()           -> POST /chat/ai-agents
useUpdateAiAgent()           -> PUT /chat/ai-agents/:id
useDeleteAiAgent()           -> DELETE /chat/ai-agents/:id
useDuplicateAiAgent()        -> POST /chat/ai-agents (com dados copiados + nome alterado)
```

Cache keys: `['ai-agents']` para lista, `['ai-agents', id]` para detalhe. staleTime: 60s.
Invalidar cache keys antigos `['ai-agent', channelId]` durante a transicao (remover do codigo).

### Types (types/index.ts)

```typescript
interface AiAgentData {
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
  readonly linkedChannelCount: number
  readonly createdAt: string
  readonly updatedAt: string
}

interface AiAgentDetail extends AiAgentData {
  readonly linkedChannels: ReadonlyArray<{
    readonly id: string
    readonly name: string
  }>
}

interface CreateAiAgentPayload {
  readonly name: string
  readonly description?: string
  readonly systemPrompt?: string
  readonly provider?: 'claude' | 'openai'
  readonly temperature?: number
  readonly maxTokens?: number
  readonly maxResponsesPerConversation?: number
  readonly isActive?: boolean
}

interface UpdateAiAgentPayload extends Partial<CreateAiAgentPayload> {}
```

---

## 8. Migracao de dados

Script unico executado em sequencia obrigatoria (NAO separar em migracoes independentes):

### Passo 1: Gerar nomes para agentes existentes

Para cada AiAgent existente:

1. Buscar o Channel correspondente via `channelId`
2. Gerar `name`: `"Agente - {channel.name}"`
3. Se nome ja existe no tenant, adicionar sufixo: `"Agente - {channel.name} (2)"`, `"(3)"`, etc.
4. Se channel nao existe (orfao), gerar nome: `"Agente orfao - {channelId.substring(0,8)}"`
5. Preservar todos os valores existentes (`systemPrompt`, `maxTokens`, `temperature`, etc.) — NAO sobrescrever com defaults novos

### Passo 2: Mover referencia para o Channel

Para cada AiAgent com `channelId`:

1. Atualizar o Channel correspondente: `channel.aiAgentId = aiAgent._id`
2. Se channel nao existe, manter agente como orfao (sem canais vinculados)

### Passo 3: Remover campo channelId

1. Remover `channelId` de todos os documentos AiAgent
2. Remover index `{ tenantId: 1, channelId: 1 }`
3. Criar index `{ tenantId: 1, name: 1 }` unique

### Propriedades da migracao

- **Idempotente:** Safe para re-executar. Verificar se `name` ja existe antes de gerar. Verificar se `aiAgentId` ja foi setado antes de mover.
- **Rollback:** Se passo 2 falhar, nao perder dados — `channelId` ainda existe no AiAgent. Passo 3 so executa se passo 2 completou com sucesso para todos os documentos.
- **Orfaos:** Agentes sem channel correspondente sao preservados com nome generico — usuario pode deletar manualmente depois.

---

## 9. Impacto e risco

| Area               | Impacto                                             | Risco                              |
| ------------------ | --------------------------------------------------- | ---------------------------------- |
| AI Agent model     | Remover channelId, adicionar name/description       | Baixo — migracao simples           |
| Channel model      | Adicionar aiAgentId                                 | Baixo — campo nullable             |
| Rotas AI Agent     | Novas rotas CRUD + remover rotas antigas            | Baixo — endpoints novos            |
| Rota Channel       | Aceitar aiAgentId + validacao                       | Baixo — campo adicional            |
| Frontend channels  | Remover config IA, adicionar dropdown, limpar state | Medio — toca em varios componentes |
| Frontend ai-agents | Feature nova completa                               | Baixo — codigo novo                |
| Settings layout    | Refatorar navegacao com searchParams                | Baixo — mudanca isolada            |
| Chat processor     | Two-step lookup via aiAgentId                       | Medio — path critico de mensagens  |
| Migracao de dados  | Script idempotente em 3 passos                      | Baixo — one-time                   |

---

## 10. Fora de escopo

- Knowledge base / RAG para agentes
- Tools/functions para agentes
- Horario de funcionamento do agente
- Multiplos providers por agente
- Historico de conversas por agente
- Metricas de uso do agente
- Paginacao e busca na lista de agentes
- Real-time sync via Socket.IO para lista de agentes (usa React Query invalidation)
