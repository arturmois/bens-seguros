# Per-Tenant Meta App Secret — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Allow each tenant to use their own Facebook App for Meta channels (Messenger, Instagram, WhatsApp Meta API) without platform admin intervention.

**Architecture:** Move META_APP_SECRET from a global env var to a per-channel config.metaAppSecret field in MongoDB. Invert webhook HMAC validation order: parse JSON first to identify the channel, then validate HMAC with that channel's secret. Auto-register webhook subscriptions via Meta Graph API when creating channels.

**Tech Stack:** Fastify, MongoDB/Mongoose, React Hook Form + Zod, Meta Graph API v25.0

**Spec:** `docs/superpowers/specs/2026-03-28-per-tenant-meta-app-secret-design.md`

---

## File Map

| File                                                                | Action | Responsibility                                                |
| ------------------------------------------------------------------- | ------ | ------------------------------------------------------------- |
| `packages/env/src/index.ts`                                         | Modify | Remove META_APP_SECRET, add CHAT_WEBHOOK_PUBLIC_URL           |
| `packages/db-chat/src/models/channel.model.ts`                      | Modify | Add index on config.metaPageId                                |
| `apps/chat-server/src/infra/http/routes/webhook-routes.ts`          | Modify | Invert HMAC flow: parse, find channel, validate               |
| `apps/chat-server/src/infra/http/routes/channel-routes.ts`          | Modify | Accept metaAppId/metaAppSecret, auto-register webhook         |
| `apps/web/src/features/channels/lib/schemas.ts`                     | Modify | Add metaAppId, metaAppSecret fields + validation              |
| `apps/web/src/features/channels/types/index.ts`                     | Modify | Add new fields to payload types                               |
| `apps/web/src/features/channels/components/channel-form-fields.tsx` | Modify | Add App ID + App Secret fields to MetaSocialFields            |
| `apps/web/src/features/channels/components/channel-meta-fields.tsx` | Modify | Add App ID + App Secret fields to ChannelMetaFields (WA Meta) |
| `apps/web/src/features/channels/components/channel-form-sheet.tsx`  | Modify | Wire new fields into create/update payloads                   |
| `apps/web/src/features/channels/hooks/use-channels.ts`              | Modify | Update ValidateMetaPayload to include appId/appSecret         |
| `.env.example`                                                      | Modify | Remove META_APP_SECRET, add CHAT_WEBHOOK_PUBLIC_URL           |
| `.env.example.prod`                                                 | Modify | Same                                                          |
| `.env`                                                              | Modify | Same                                                          |
| `docs/MULTI-CHANNEL-SETUP.md`                                       | Modify | Rewrite for tenant autonomy                                   |
| `docs/CHAT-SPEC.md`                                                 | Modify | Update Meta API section                                       |

---

## Task 1: Update env vars

**Files:**

- Modify: `packages/env/src/index.ts`
- Modify: `.env.example`
- Modify: `.env.example.prod`
- Modify: `.env`

- [ ] **Step 1: Remove META_APP_SECRET and add CHAT_WEBHOOK_PUBLIC_URL in env schema**

In `packages/env/src/index.ts`, remove line 35 (META_APP_SECRET) and add CHAT_WEBHOOK_PUBLIC_URL:

```ts
// REMOVE this line:
META_APP_SECRET: z.string().optional(),

// ADD this line (after CHAT_SERVER_URL, around line 21):
CHAT_WEBHOOK_PUBLIC_URL: z.string().url().optional(),
```

Keep META_WEBHOOK_VERIFY_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID as-is.

- [ ] **Step 2: Update .env.example**

Replace the META section (lines 39-42):

```env
# === META (webhook verification — shared across all tenants) ===
META_WEBHOOK_VERIFY_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=

# === CHAT WEBHOOK (public URL for auto-registering webhooks with Meta) ===
# Defaults to CHAT_SERVER_URL/chat/webhook/meta if not set
# CHAT_WEBHOOK_PUBLIC_URL=https://chat.bensseg.com/chat/webhook/meta
```

- [ ] **Step 3: Update .env.example.prod**

Replace the META section (lines 68-71):

```env
# === META (webhook verification — shared across all tenants) ===
# META_WEBHOOK_VERIFY_TOKEN=
# META_WHATSAPP_PHONE_NUMBER_ID=

# === CHAT WEBHOOK (public URL for auto-registering webhooks with Meta) ===
# CHAT_WEBHOOK_PUBLIC_URL=https://chat.bensseg.com/chat/webhook/meta
```

- [ ] **Step 4: Update .env (local dev)**

Replace lines 32-34. Remove META_APP_SECRET= line entirely. Keep:

```env
META_WEBHOOK_VERIFY_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
```

- [ ] **Step 5: Verify typecheck passes**

Run: `pnpm --filter @repo/env exec tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```
refactor(env): remove META_APP_SECRET, add CHAT_WEBHOOK_PUBLIC_URL

App Secret is now per-channel (stored in channel config), not global.
CHAT_WEBHOOK_PUBLIC_URL used for auto-registering webhooks with Meta.
```

---

## Task 2: Add MongoDB index on config.metaPageId

**Files:**

- Modify: `packages/db-chat/src/models/channel.model.ts`

- [ ] **Step 1: Add index**

After line 35 (`channelSchema.index({ tenantId: 1, type: 1 })`), add:

```ts
channelSchema.index({ 'config.metaPageId': 1, isActive: 1 })
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @repo/db-chat exec tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```
perf(db-chat): add index on config.metaPageId for webhook routing
```

---

## Task 3: Rewrite webhook HMAC validation (per-channel)

**Files:**

- Modify: `apps/chat-server/src/infra/http/routes/webhook-routes.ts`

This is the core change. New flow: parse JSON, extract accountId, find channel, validate HMAC with channel's secret.

- [ ] **Step 1: Replace the global getAppSecret with a per-channel lookup function**

Remove the `getAppSecret()` function (lines 68-74) entirely. Update `validateHmacSignature` to accept the secret as parameter:

```ts
function validateHmacSignature(
  rawBody: Buffer,
  signatureHeader: string,
  appSecret: string
): boolean {
  const expectedSignature = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')
  const receivedBuffer = Buffer.from(signatureHeader, 'utf8')

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer)
}
```

- [ ] **Step 2: Add channel lookup helper**

Add this import at the top of the file:

```ts
import { Channel } from '@repo/db-chat'
```

Add a helper function after `validateHmacSignature`:

```ts
async function findChannelByAccountId(
  accountId: string,
  objectType: string
): Promise<{ appSecret: string; channelId: string; tenantId: string } | null> {
  const isPageOrInstagram = objectType === 'page' || objectType === 'instagram'
  const filter = isPageOrInstagram
    ? { 'config.metaPageId': accountId, isActive: true }
    : { 'config.metaPhoneNumberId': accountId, isActive: true }

  const channel = await Channel.findOne(filter).lean().exec()

  if (!channel) {
    return null
  }

  const config = channel.config as Record<string, unknown> | undefined
  const appSecret = config?.['metaAppSecret']

  if (typeof appSecret !== 'string' || appSecret.length === 0) {
    return null
  }

  return {
    appSecret,
    channelId: String(channel._id),
    tenantId: String(channel.tenantId),
  }
}
```

- [ ] **Step 3: Rewrite the POST handler**

Replace the entire `app.post('/chat/webhook/meta', ...)` handler (lines 205-329) with the new flow: check signature header, parse body, find channel by accountId, validate HMAC with channel's secret, then process entries.

The key difference from the old handler is between rawBody check and entry processing:

```ts
// Parse JSON first to identify the channel (before HMAC validation)
const bodyParsed = metaWebhookPayloadSchema.safeParse(request.body)

if (!bodyParsed.success) {
  app.log.warn(
    { body: request.body },
    'Received malformed Meta webhook payload'
  )
  return reply.status(200).send({ success: true })
}

const { object, entry } = bodyParsed.data
const firstEntry = entry[0]

if (!firstEntry) {
  return reply.status(200).send({ success: true })
}

// Find channel by accountId to get its appSecret
const channelInfo = await findChannelByAccountId(firstEntry.id, object)

if (!channelInfo) {
  app.log.debug(
    { accountId: firstEntry.id, object },
    'No channel found for webhook, ignoring'
  )
  return reply.status(200).send({ success: true })
}

// Validate HMAC with the channel's own appSecret
if (!validateHmacSignature(rawBody, signatureHeader, channelInfo.appSecret)) {
  return reply.status(401).send({
    success: false,
    error: {
      code: 'INVALID_SIGNATURE',
      message: 'HMAC signature verification failed',
    },
  })
}
```

After HMAC validation, the rest of the handler (entry processing, queueing) stays the same as current code.

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm --filter @app/chat-server exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```
feat(webhook): validate HMAC per-channel instead of global secret

Parse webhook JSON first to identify channel by accountId,
then validate HMAC using that channel's config.metaAppSecret.
Removes dependency on global META_APP_SECRET env var.
```

---

## Task 4: Add auto-register webhook + accept new fields in channel routes

**Files:**

- Modify: `apps/chat-server/src/infra/http/routes/channel-routes.ts`

- [ ] **Step 1: Add Meta Graph API webhook registration helpers**

After the existing `META_GRAPH_API` constant (line 43), add three functions:

`registerAppWebhookSubscription(metaAppId, metaAppSecret)` — calls `POST /{app-id}/subscriptions` with object=page, callback_url from CHAT_WEBHOOK_PUBLIC_URL env (default: CHAT_SERVER_URL + /chat/webhook/meta), verify_token from META_WEBHOOK_VERIFY_TOKEN env, fields=messages,messaging_postbacks, access_token={appId}|{appSecret}. Returns `{ success, error? }`.

`subscribePageToWebhooks(metaPageId, metaToken)` — calls `POST /{page-id}/subscribed_apps` with subscribed_fields=messages,messaging_postbacks, access_token=metaToken. Returns `{ success, error? }`.

`autoRegisterWebhook(channelType, config)` — orchestrates: calls registerAppWebhookSubscription, then subscribePageToWebhooks only for MESSENGER. Returns `{ appSubscription: string, pageSubscription: string }`.

- [ ] **Step 2: Update validateMetaBodySchema to accept metaAppId and metaAppSecret**

Replace lines 37-41:

```ts
const validateMetaBodySchema = z.object({
  pageId: z.string().min(1),
  token: z.string().min(1),
  channelType: z.enum(['INSTAGRAM', 'MESSENGER', 'WHATSAPP_META']),
  metaAppId: z.string().min(1).optional(),
  metaAppSecret: z.string().min(1).optional(),
})
```

- [ ] **Step 3: Update validate-meta route to also verify App credentials**

In the validate-meta handler, after existing page/token validation succeeds, add App credential validation if metaAppId and metaAppSecret are provided:

```ts
const { pageId, token, channelType, metaAppId, metaAppSecret } =
  validateMetaBodySchema.parse(request.body)

// ... existing validateMetaCredentials call ...

// Also validate App credentials if provided
if (metaAppId && metaAppSecret) {
  const appAccessToken = `${metaAppId}|${metaAppSecret}`
  const appResponse = await fetch(
    `${META_GRAPH_API}/${metaAppId}?access_token=${appAccessToken}`
  )
  if (!appResponse.ok) {
    return reply.status(422).send({
      success: false,
      error: {
        code: 'INVALID_APP_CREDENTIALS',
        message: 'App ID ou App Secret inválido',
      },
    })
  }
}
```

- [ ] **Step 4: Add webhook auto-registration to channel creation**

In the `app.post('/chat/channels', ...)` handler, after `Channel.create()` succeeds and before returning, add:

```ts
const isMetaChannel =
  body.type === 'MESSENGER' ||
  body.type === 'INSTAGRAM' ||
  (body.type === 'WHATSAPP' && body.brokerType === 'META')

let webhookSetup: WebhookSetupResult | undefined
if (isMetaChannel && body.config) {
  webhookSetup = await autoRegisterWebhook(body.type, body.config)
}

return reply.status(201).send({
  success: true,
  data: mapChannel(channel.toObject() as unknown as Record<string, unknown>),
  ...(webhookSetup ? { meta: { webhookSetup } } : {}),
})
```

- [ ] **Step 5: Add webhook auto-registration to channel update**

In the `app.put('/chat/channels/:id', ...)` handler, after `Channel.findOneAndUpdate()` succeeds, if config was changed on a Meta channel, call autoRegisterWebhook and include result in response meta.

- [ ] **Step 6: Verify typecheck passes**

Run: `pnpm --filter @app/chat-server exec tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```
feat(channels): auto-register Meta webhook on channel creation

Accept metaAppId/metaAppSecret in channel config.
On create/update, auto-register callback URL via POST /{app-id}/subscriptions
and subscribe page via POST /{page-id}/subscribed_apps (Messenger only).
Returns webhookSetup status in response meta.
```

---

## Task 5: Update frontend types and form schema

**Files:**

- Modify: `apps/web/src/features/channels/lib/schemas.ts`

- [ ] **Step 1: Add fields to Zod form schema**

In schemas.ts, add two new fields to the schema object (after metaPageId on line 25):

```ts
    metaAppId: z.string().optional(),
    metaAppSecret: z.string().optional(),
```

- [ ] **Step 2: Add validation rules in superRefine**

After the existing MESSENGER/INSTAGRAM block (lines 49-64), add:

```ts
const needsMetaApp =
  data.channelType === 'MESSENGER' ||
  data.channelType === 'INSTAGRAM' ||
  (data.channelType === 'WHATSAPP' && data.brokerType === 'META')

if (needsMetaApp) {
  if (!data.metaAppId || data.metaAppId.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'App ID é obrigatório para canais Meta',
      path: ['metaAppId'],
    })
  }
  if (!data.metaAppSecret || data.metaAppSecret.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'App Secret é obrigatório para canais Meta',
      path: ['metaAppSecret'],
    })
  }
}
```

- [ ] **Step 3: Add default values in buildEmptyChannelForm**

Add to the return object:

```ts
    metaAppId: '',
    metaAppSecret: '',
```

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```
feat(channels): add metaAppId and metaAppSecret to form schema

Required for Messenger, Instagram, and WhatsApp Meta channels.
Validated via superRefine conditional logic.
```

---

## Task 6: Update frontend form fields

**Files:**

- Modify: `apps/web/src/features/channels/components/channel-form-fields.tsx`
- Modify: `apps/web/src/features/channels/components/channel-meta-fields.tsx`

- [ ] **Step 1: Create reusable MetaAppFields component in channel-form-fields.tsx**

Add after WebChatFields (after line 189). Two fields: App ID (text input) and App Secret (password input), both with helper text explaining where to find them in Meta for Developers.

- [ ] **Step 2: Add MetaAppFields to MetaSocialFields**

Add `<MetaAppFields register={register} errors={errors} />` at the top of MetaSocialFields JSX, before the Page ID field.

- [ ] **Step 3: Add MetaAppFields to ChannelMetaFields (WA Meta)**

In channel-meta-fields.tsx, import MetaAppFields from channel-form-fields and add it at the top of ChannelMetaFields JSX, before the Token field.

- [ ] **Step 4: Update buildCreatePayload to include metaAppId and metaAppSecret**

In the Meta social channels block (lines 323-331), add metaAppId and metaAppSecret to config:

```ts
    config: {
      metaAppId: values.metaAppId,
      metaAppSecret: values.metaAppSecret,
      metaPageId: values.metaPageId,
      metaToken: values.metaToken,
    },
```

In the WhatsApp META block (lines 295-304), add to config:

```ts
    config: {
      metaAppId: values.metaAppId,
      metaAppSecret: values.metaAppSecret,
      metaToken: values.metaToken,
      metaPhoneNumberId: values.phoneNumberId,
    },
```

- [ ] **Step 5: Verify typecheck passes**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```
feat(channels): add App ID and App Secret fields to Meta channel forms

New MetaAppFields component shared by MetaSocialFields (Messenger/Instagram)
and ChannelMetaFields (WhatsApp Meta).
```

---

## Task 7: Wire new fields in form sheet (edit mode)

**Files:**

- Modify: `apps/web/src/features/channels/components/channel-form-sheet.tsx`

- [ ] **Step 1: Include metaAppId and metaAppSecret in form reset (edit mode)**

In the useEffect that resets the form when editing (around line 102), add:

```ts
        metaAppId: cfgString('metaAppId'),
        metaAppSecret: cfgString('metaAppSecret'),
```

- [ ] **Step 2: Include new fields in update payload for Meta Social channels**

In handleSubmit, update the isMetaSocial config block:

```ts
              config: {
                metaAppId: values.metaAppId,
                metaAppSecret: values.metaAppSecret,
                metaPageId: values.metaPageId,
                metaToken: values.metaToken,
              },
```

- [ ] **Step 3: Include new fields in update payload for WhatsApp Meta**

Update the isWhatsAppMeta config block:

```ts
              config: {
                metaAppId: values.metaAppId,
                metaAppSecret: values.metaAppSecret,
                metaToken: values.metaToken,
                metaPhoneNumberId: values.phoneNumberId,
              },
```

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```
feat(channels): wire metaAppId/metaAppSecret in edit mode
```

---

## Task 8: Update validate-meta hook and wire watch values

**Files:**

- Modify: `apps/web/src/features/channels/hooks/use-channels.ts`
- Modify: `apps/web/src/features/channels/components/channel-form-fields.tsx`
- Modify: `apps/web/src/features/channels/components/channel-form-sheet.tsx`

- [ ] **Step 1: Add new fields to ValidateMetaPayload**

In use-channels.ts, update the interface (lines 99-103):

```ts
interface ValidateMetaPayload {
  pageId: string
  token: string
  channelType: 'INSTAGRAM' | 'MESSENGER' | 'WHATSAPP_META'
  metaAppId?: string
  metaAppSecret?: string
}
```

- [ ] **Step 2: Add watch props to MetaSocialFieldsProps**

In channel-form-fields.tsx, add to MetaSocialFieldsProps interface:

```ts
  readonly watchMetaAppId?: string
  readonly watchMetaAppSecret?: string
```

Update handleValidate to pass the new fields:

```ts
function handleValidate() {
  if (!watchMetaPageId || !watchMetaToken) return
  validate.mutate({
    pageId: watchMetaPageId,
    token: watchMetaToken,
    channelType,
    metaAppId: watchMetaAppId,
    metaAppSecret: watchMetaAppSecret,
  })
}
```

- [ ] **Step 3: Pass watch values from channel-form-sheet.tsx**

Add watchers:

```ts
const watchedMetaAppId = form.watch('metaAppId')
const watchedMetaAppSecret = form.watch('metaAppSecret')
```

Pass to MetaSocialFields:

```tsx
watchMetaAppId = { watchedMetaAppId }
watchMetaAppSecret = { watchedMetaAppSecret }
```

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```
feat(channels): validate App credentials in Testar Conexão
```

---

## Task 9: Update documentation

**Files:**

- Modify: `docs/MULTI-CHANNEL-SETUP.md`
- Modify: `docs/CHAT-SPEC.md`

- [ ] **Step 1: Rewrite MULTI-CHANNEL-SETUP.md section 2 (Messenger)**

Key changes:

- Remove "Configurar App Secret na VPS" step — no longer needed
- Remove manual webhook configuration steps — now automatic
- New flow: tenant creates Facebook App, fills form with App ID + Secret + Page ID + Token, system auto-registers
- Keep troubleshooting table but update: remove META_APP_SECRET is not configured row, update HMAC failure to reference per-channel secret

- [ ] **Step 2: Rewrite MULTI-CHANNEL-SETUP.md section 3 (Instagram)**

Key changes:

- App subscription is automatic, but add note about Instagram requiring manual field activation in dashboard
- Add alert: "O webhook foi registrado automaticamente. Ative o campo messages em Meta for Developers > Instagram > Webhooks."

- [ ] **Step 3: Update MULTI-CHANNEL-SETUP.md section 4 (WhatsApp Meta)**

Add App ID + App Secret to the WhatsApp Meta API flow.

- [ ] **Step 4: Update MULTI-CHANNEL-SETUP.md section 6 (Deploy)**

Update environment variables reference:

- Remove META_APP_SECRET
- Add CHAT_WEBHOOK_PUBLIC_URL
- Update note about App Secret to say it's now per-channel

- [ ] **Step 5: Update CHAT-SPEC.md Meta API section**

Change HMAC reference from global to per-channel. Add note about metaAppId and metaAppSecret in channel config.

- [ ] **Step 6: Commit**

```
docs: update multi-channel setup for per-tenant Meta credentials

Messenger/WA Meta: webhook registered automatically on channel creation.
Instagram: app subscription automatic, field activation still manual.
META_APP_SECRET removed from env, now per-channel config.
```

---

## Task 10: Full quality gates

- [ ] **Step 1: Run lint**

Run: `pnpm lint`
Expected: zero errors

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: zero errors

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: successful build

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: all tests pass

- [ ] **Step 5: Fix any failures and commit**

If any gate fails, fix the issue and create a new commit with the fix.
