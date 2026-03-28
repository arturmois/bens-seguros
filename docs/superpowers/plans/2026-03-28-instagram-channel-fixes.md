# Instagram/Messenger Channel Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 bugs preventing Instagram/Messenger channels from working in production, add Meta token validation, and update documentation.

**Architecture:** Pure bugfixes and incremental improvements. Backend gets `config` in update schema + new validation endpoint. Frontend fixes brokerType, edit flow, and adds validate button. No new packages.

**Tech Stack:** Fastify 5 + Zod (backend), React 19 + React Hook Form + TanStack Query (frontend)

---

### Task 1: Fix backend schemas (brokerType enum + config in update)

**Files:**

- Modify: `apps/chat-server/src/infra/http/routes/channel-routes.ts:12-26`
- Modify: `apps/web/src/features/chat/types/index.ts:67-76`
- Modify: `apps/web/src/features/channels/types/index.ts:10,17-22`

- [ ] **Step 1: Add MESSENGER and INSTAGRAM to createChannelBodySchema brokerType enum**

In `apps/chat-server/src/infra/http/routes/channel-routes.ts`, change line 15:

```typescript
// Before
brokerType: z.enum(['BAILEYS', 'META', 'WEB_CHAT']),

// After
brokerType: z.enum(['BAILEYS', 'META', 'WEB_CHAT', 'MESSENGER', 'INSTAGRAM']),
```

- [ ] **Step 2: Add config to updateChannelBodySchema**

In the same file, change `updateChannelBodySchema` (lines 20-26):

```typescript
const updateChannelBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phoneNumber: z.string().optional(),
  isActive: z.boolean().optional(),
  aiUserId: z.string().optional(),
  aiAgentId: z.string().min(1).nullable().optional(),
  config: z.record(z.unknown()).optional(),
})
```

- [ ] **Step 3: Add config field to ChannelData type**

In `apps/web/src/features/chat/types/index.ts`, add `config` to `ChannelData`:

```typescript
export interface ChannelData {
  readonly id: string
  readonly name: string
  readonly type: ChannelType
  readonly brokerType:
    | 'BAILEYS'
    | 'META'
    | 'WEB_CHAT'
    | 'MESSENGER'
    | 'INSTAGRAM'
  readonly phoneNumber: string | null
  readonly isActive: boolean
  readonly status: ChannelStatus
  readonly aiAgentId: string | null
  readonly config?: Record<string, unknown>
}
```

- [ ] **Step 4: Update CreateChannelPayload and UpdateChannelPayload types**

In `apps/web/src/features/channels/types/index.ts`:

```typescript
export interface CreateChannelPayload {
  readonly name: string
  readonly type: 'WHATSAPP' | 'WEB_CHAT' | 'MESSENGER' | 'INSTAGRAM'
  readonly brokerType:
    | 'BAILEYS'
    | 'META'
    | 'WEB_CHAT'
    | 'MESSENGER'
    | 'INSTAGRAM'
  readonly phoneNumber?: string
  readonly metaToken?: string
  readonly phoneNumberId?: string
  readonly config?: Record<string, unknown>
}

export interface UpdateChannelPayload {
  readonly name?: string
  readonly phoneNumber?: string
  readonly isActive?: boolean
  readonly aiAgentId?: string | null
  readonly config?: Record<string, unknown>
}
```

- [ ] **Step 5: Commit**

```
feat(channels): add MESSENGER/INSTAGRAM brokerType and config to update schema
```

---

### Task 2: Fix buildCreatePayload brokerType

**Files:**

- Modify: `apps/web/src/features/channels/components/channel-form-fields.tsx:266-274`

- [ ] **Step 1: Fix the fallback branch in buildCreatePayload**

In `apps/web/src/features/channels/components/channel-form-fields.tsx`, replace the final return block (lines 266-275):

```typescript
// Before
return {
  ...base,
  type: values.channelType,
  brokerType: 'META',
  config: {
    metaPageId: values.metaPageId,
    metaToken: values.metaToken,
  },
}

// After
return {
  ...base,
  type: values.channelType,
  brokerType: values.channelType,
  config: {
    metaPageId: values.metaPageId,
    metaToken: values.metaToken,
  },
}
```

- [ ] **Step 2: Commit**

```
fix(channels): use channel type as brokerType for Instagram/Messenger
```

---

### Task 3: Fix edit flow (form reset + submit payload)

**Files:**

- Modify: `apps/web/src/features/channels/components/channel-form-sheet.tsx:86-113`

- [ ] **Step 1: Fix form.reset to populate config fields**

In `apps/web/src/features/channels/components/channel-form-sheet.tsx`, replace the edit reset block (lines 86-94):

```typescript
if (channel) {
  const cfg = channel.config as Record<string, string> | undefined
  form.reset({
    channelType: channel.type,
    name: channel.name,
    brokerType: toFormBrokerType(channel.brokerType),
    phoneNumber: channel.phoneNumber ?? '',
    aiAgentId: channel.aiAgentId ?? null,
    metaPageId: cfg?.metaPageId ?? '',
    metaToken: cfg?.metaToken ?? '',
    phoneNumberId: cfg?.metaPhoneNumberId ?? '',
    widgetColor: cfg?.widgetColor ?? '#1f4b5f',
    welcomeMessage: cfg?.welcomeMessage ?? '',
    allowedOrigins: Array.isArray(cfg?.allowedOrigins)
      ? (cfg.allowedOrigins as unknown as string[]).join(', ')
      : (cfg?.allowedOrigins ?? ''),
  })
  return
}
```

- [ ] **Step 2: Fix handleSubmit to include config fields on edit**

Replace the edit branch in `handleSubmit` (lines 100-114):

```typescript
function handleSubmit(values: ChannelFormValues) {
  if (isEditMode && channel) {
    const isMetaSocial =
      channel.type === 'MESSENGER' || channel.type === 'INSTAGRAM'
    const isWhatsAppMeta =
      channel.type === 'WHATSAPP' && channel.brokerType === 'META'

    updateChannel.mutate(
      {
        id: channel.id,
        payload: {
          name: values.name,
          phoneNumber: values.phoneNumber,
          aiAgentId: values.aiAgentId,
          ...(isMetaSocial
            ? {
                config: {
                  metaPageId: values.metaPageId,
                  metaToken: values.metaToken,
                },
              }
            : {}),
          ...(isWhatsAppMeta
            ? {
                config: {
                  metaToken: values.metaToken,
                  metaPhoneNumberId: values.phoneNumberId,
                },
              }
            : {}),
        },
      },
      { onSuccess: () => onOpenChange(false) }
    )
    return
  }

  const payload = buildCreatePayload(values)
  createChannel.mutate(payload, {
    onSuccess: () => onOpenChange(false),
  })
}
```

- [ ] **Step 3: Commit**

```
fix(channels): populate and persist config fields on channel edit
```

---

### Task 4: Add Meta token validation endpoint

**Files:**

- Modify: `apps/chat-server/src/infra/http/routes/channel-routes.ts`

- [ ] **Step 1: Add validation schema and helper function**

Add after the `pairChannelBodySchema` definition (after line 34):

```typescript
const validateMetaBodySchema = z.object({
  pageId: z.string().min(1),
  token: z.string().min(1),
  channelType: z.enum(['INSTAGRAM', 'MESSENGER']),
})

const META_GRAPH_API = 'https://graph.facebook.com/v21.0'

async function validateMetaCredentials(
  pageId: string,
  token: string,
  channelType: 'INSTAGRAM' | 'MESSENGER'
): Promise<
  | { valid: true; name: string; username?: string }
  | { valid: false; error: string }
> {
  const fields = channelType === 'INSTAGRAM' ? 'id,name,username' : 'id,name'
  const url = `${META_GRAPH_API}/${pageId}?fields=${fields}&access_token=${token}`

  try {
    const response = await fetch(url)
    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok || data['error']) {
      const err = data['error'] as Record<string, unknown> | undefined
      const message =
        typeof err?.['message'] === 'string'
          ? err['message']
          : 'Token ou Page ID invalido'
      return { valid: false, error: message }
    }

    return {
      valid: true,
      name:
        typeof data['name'] === 'string' ? data['name'] : String(data['id']),
      username:
        typeof data['username'] === 'string' ? data['username'] : undefined,
    }
  } catch {
    return { valid: false, error: 'Falha ao conectar com a API do Meta' }
  }
}
```

- [ ] **Step 2: Add POST /chat/channels/validate-meta route**

Add inside `channelRoutes` function, before the `app.delete` route:

```typescript
app.post(
  '/chat/channels/validate-meta',
  async (
    request: FastifyRequest<{
      Body: z.infer<typeof validateMetaBodySchema>
    }>,
    reply: FastifyReply
  ) => {
    const { pageId, token, channelType } = validateMetaBodySchema.parse(
      request.body
    )

    const result = await validateMetaCredentials(pageId, token, channelType)

    if (!result.valid) {
      return reply.status(422).send({
        success: false,
        error: {
          code: 'INVALID_META_CREDENTIALS',
          message: result.error,
        },
      })
    }

    return reply.send({
      success: true,
      data: { name: result.name, username: result.username },
    })
  }
)
```

- [ ] **Step 3: Add validation to POST /chat/channels (create) for Meta social channels**

In the existing create handler, after `const body = createChannelBodySchema.parse(request.body)` and before `const isWebChat`:

```typescript
if (body.type === 'INSTAGRAM' || body.type === 'MESSENGER') {
  const cfg = body.config as Record<string, string> | undefined
  const pageId = cfg?.metaPageId
  const token = cfg?.metaToken

  if (pageId && token) {
    const validation = await validateMetaCredentials(pageId, token, body.type)
    if (!validation.valid) {
      return reply.status(422).send({
        success: false,
        error: {
          code: 'INVALID_META_CREDENTIALS',
          message: validation.error,
        },
      })
    }
  }
}
```

- [ ] **Step 4: Add validation to PUT /chat/channels/:id (update) for config changes**

In the existing update handler, after `const body = updateChannelBodySchema.parse(request.body)` and before `if (body.aiAgentId)`:

```typescript
if (body.config) {
  const cfg = body.config as Record<string, string>
  const existingChannel = await Channel.findOne({ _id: id, tenantId })
    .lean()
    .exec()

  if (
    existingChannel &&
    (existingChannel.type === 'INSTAGRAM' ||
      existingChannel.type === 'MESSENGER')
  ) {
    const pageId = cfg.metaPageId
    const token = cfg.metaToken
    if (pageId && token) {
      const validation = await validateMetaCredentials(
        pageId,
        token,
        existingChannel.type as 'INSTAGRAM' | 'MESSENGER'
      )
      if (!validation.valid) {
        return reply.status(422).send({
          success: false,
          error: {
            code: 'INVALID_META_CREDENTIALS',
            message: validation.error,
          },
        })
      }
    }
  }
}
```

- [ ] **Step 5: Commit**

```
feat(channels): add Meta token validation on create, update, and dedicated endpoint
```

---

### Task 5: Add useValidateMetaChannel hook + "Testar Conexao" button

**Files:**

- Modify: `apps/web/src/features/channels/hooks/use-channels.ts`
- Modify: `apps/web/src/features/channels/components/channel-form-fields.tsx`
- Modify: `apps/web/src/features/channels/components/channel-form-sheet.tsx`

- [ ] **Step 1: Add useValidateMetaChannel hook**

In `apps/web/src/features/channels/hooks/use-channels.ts`, add at the end of the file:

```typescript
interface ValidateMetaPayload {
  pageId: string
  token: string
  channelType: 'INSTAGRAM' | 'MESSENGER'
}

interface ValidateMetaResult {
  name: string
  username?: string
}

export function useValidateMetaChannel() {
  return useMutation({
    mutationFn: async (payload: ValidateMetaPayload) => {
      const response = await chatApi.post<ValidateMetaResult>(
        '/chat/channels/validate-meta',
        payload
      )
      return response.data
    },
  })
}
```

- [ ] **Step 2: Update onError in useCreateChannel and useUpdateChannel to show backend validation messages**

In the same file, update both `onError` handlers:

```typescript
// In useCreateChannel
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { data?: { error?: { message?: string } } } }
      const msg = axiosErr.response?.data?.error?.message ?? 'Erro ao criar canal'
      toast.error(msg)
    },

// In useUpdateChannel
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { data?: { error?: { message?: string } } } }
      const msg = axiosErr.response?.data?.error?.message ?? 'Erro ao atualizar canal'
      toast.error(msg)
    },
```

- [ ] **Step 3: Replace MetaSocialFields component with validate button and improved helper texts**

In `apps/web/src/features/channels/components/channel-form-fields.tsx`, add imports at top:

```typescript
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useValidateMetaChannel } from '../hooks/use-channels'
```

Replace the entire `MetaSocialFields` component:

```typescript
interface MetaSocialFieldsProps {
  readonly register: UseFormRegister<ChannelFormValues>
  readonly errors: FieldErrors<ChannelFormValues>
  readonly channelType: 'MESSENGER' | 'INSTAGRAM'
  readonly watchMetaPageId?: string
  readonly watchMetaToken?: string
}

export function MetaSocialFields({
  register,
  errors,
  channelType,
  watchMetaPageId,
  watchMetaToken,
}: MetaSocialFieldsProps) {
  const isInstagram = channelType === 'INSTAGRAM'
  const validate = useValidateMetaChannel()

  const pageIdHelper = isInstagram
    ? 'ID da conta Instagram. Encontre via Graph API Explorer: GET /me?fields=id,username (formato: 17841xxxxx)'
    : 'ID da Página do Facebook. Encontre em Configurações da Página > Transparência'

  function handleValidate() {
    if (!watchMetaPageId || !watchMetaToken) return
    validate.mutate({
      pageId: watchMetaPageId,
      token: watchMetaToken,
      channelType,
    })
  }

  return (
    <>
      <FormField
        label="Page ID"
        error={errors.metaPageId?.message}
        helperText={pageIdHelper}
        required
      >
        <Input placeholder="ID da página Meta" {...register('metaPageId')} />
      </FormField>

      <FormField
        label="Token"
        error={errors.metaToken?.message}
        helperText="Page Access Token. Gere em Meta for Developers > seu App > Messenger > Tokens de Acesso."
        required
      >
        <Input
          type="password"
          placeholder="Token de acesso da página"
          {...register('metaToken')}
        />
      </FormField>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleValidate}
          disabled={!watchMetaPageId || !watchMetaToken || validate.isPending}
        >
          {validate.isPending ? (
            <Loader2 className="mr-2 size-3 animate-spin" />
          ) : null}
          Testar Conexão
        </Button>
        {validate.isSuccess && (
          <span className="text-sm text-green-600">
            Conectado: {validate.data.username ? `@${validate.data.username}` : validate.data.name}
          </span>
        )}
        {validate.isError && (
          <span className="text-sm text-destructive">
            Falha na validação
          </span>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Pass watch values from channel-form-sheet.tsx to MetaSocialFields**

In `apps/web/src/features/channels/components/channel-form-sheet.tsx`, update the MetaSocialFields usage:

```typescript
          {(watchedChannelType === 'MESSENGER' ||
            watchedChannelType === 'INSTAGRAM') && (
            <MetaSocialFields
              register={form.register}
              errors={form.formState.errors}
              channelType={watchedChannelType}
              watchMetaPageId={form.watch('metaPageId')}
              watchMetaToken={form.watch('metaToken')}
            />
          )}
```

- [ ] **Step 5: Commit**

```
feat(channels): add Meta token validation button and improved error messages
```

---

### Task 6: Update tutorial documentation

**Files:**

- Modify: `docs/MULTI-CHANNEL-SETUP.md`

- [ ] **Step 1: Update section 3.5 (Criar canal no sistema)**

Replace lines 160-169 with corrected guidance:

```markdown
### 3.5 Criar canal no sistema

1. Acesse **Configuracoes > Canais**
2. Clique **Novo Canal**
3. Selecione tipo **INSTAGRAM**
4. Preencha:
   - **Nome**: Ex: "Instagram @corretora_bens"
   - **Page ID**: ID da conta Instagram (NAO e o App ID do Facebook)
     - Para encontrar: acesse [Graph API Explorer](https://developers.facebook.com/tools/explorer/), selecione seu App e Page Token, execute: `GET /me?fields=id,username`
     - O `id` retornado (formato `17841xxxxx`) e o valor correto
   - **Access Token**: Page Access Token (NAO e o token do Instagram)
     - Para gerar: Meta for Developers > seu App > **Messenger > Configuracoes > Tokens de Acesso**
     - Selecione a **Pagina do Facebook vinculada ao Instagram** e clique **Gerar Token**
5. Clique **Testar Conexao** para validar (deve mostrar o @username)
6. Clique **Criar Canal**
```

- [ ] **Step 2: Add troubleshooting section after 3.7**

Add new section 3.8 after the verification table:

```markdown
### 3.8 Troubleshooting

| Erro                                       | Causa                                                   | Solucao                                                                         |
| ------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `META_WHATSAPP_TOKEN is not configured`    | Variavel de ambiente (App Secret) nao definida          | Adicione o App Secret do Facebook App no `.env` da VPS e reinicie os containers |
| `HMAC signature verification failed` (401) | App Secret incorreto                                    | Verifique em Meta for Developers > App > Configuracoes > Basico > Chave Secreta |
| `No active channel found`                  | Page ID no canal nao bate com o ID enviado pelo webhook | Corrija o Page ID usando o valor de `GET /me?fields=id,username`                |
| `Invalid OAuth access token`               | Token e do tipo errado (User Token vs Page Token)       | Gere um **Page Access Token** em Messenger > Tokens de Acesso                   |
| `Received malformed Meta webhook payload`  | Imagem Docker desatualizada                             | Faca deploy da imagem mais recente                                              |

**Dica:** O App Secret (`META_WHATSAPP_TOKEN`) e compartilhado entre WhatsApp, Messenger e Instagram — todos usam o mesmo Facebook App.
```

- [ ] **Step 3: Update section 6 env vars to clarify shared usage**

Replace the env var block in section 6:

```markdown
### Variaveis de ambiente

- `META_WHATSAPP_VERIFY_TOKEN` — Token de verificacao do webhook (compartilhado por WhatsApp, Messenger e Instagram)
- `META_WHATSAPP_TOKEN` — App Secret do Facebook App, usado para validacao HMAC de todos os webhooks Meta
- `WIDGET_DIST_PATH` — (Opcional) Caminho custom para dist do widget
```

- [ ] **Step 4: Commit**

```
docs: update Instagram setup tutorial with correct Page ID, token type, and troubleshooting
```

---

### Task 7: Build, typecheck, lint

- [ ] **Step 1: Run typecheck**

```bash
pnpm turbo typecheck --filter=@app/chat-server --filter=@app/web
```

Expected: no errors

- [ ] **Step 2: Run lint**

```bash
pnpm turbo lint --filter=@app/chat-server --filter=@app/web
```

Expected: no errors

- [ ] **Step 3: Fix any issues found, commit**

Fix and commit any typecheck or lint errors discovered.
