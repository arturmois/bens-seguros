# Meta OAuth + Embedded Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual per-tenant Meta credentials with centralized OAuth via Facebook Login for Business (Messenger/Instagram) and Embedded Signup (WhatsApp).

**Architecture:** Single Facebook App owned by SaaS. Clients connect via OAuth popup — zero manual fields. Tokens encrypted with AES-256-GCM. Refresh via BullMQ cron. Webhook HMAC uses global app secret. Baileys (QR) remains as WhatsApp alternative.

**Tech Stack:** Fastify 5, Mongoose, BullMQ 5, React 19, Next.js 16, Zod, AES-256-GCM, Facebook Login for Business, WhatsApp Embedded Signup (FB JS SDK)

**Spec:** `docs/superpowers/specs/2026-03-30-meta-oauth-embedded-signup-design.md`

---

## File Structure

### New Files

| File                                                                   | Responsibility                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `apps/chat-server/src/infra/http/routes/meta-routes.ts`                | Fastify route plugin for all `/meta/*` endpoints                           |
| `apps/chat-server/src/infra/http/routes/meta-oauth-service.ts`         | OAuth URL generation, state validation, code→token exchange, token refresh |
| `apps/chat-server/src/infra/http/routes/meta-assets-service.ts`        | Fetch Pages + Instagram accounts via Graph API                             |
| `apps/chat-server/src/infra/http/routes/meta-connect-service.ts`       | Connect/disconnect channel, encrypt token, subscribe webhooks              |
| `apps/chat-server/src/infra/http/routes/meta-whatsapp-service.ts`      | (Phase 2) Embedded Signup code→BISU token, register phone, subscribe WABA  |
| `packages/shared/src/meta-crypto.ts`                                   | `encryptToken()` / `decryptToken()` wrappers over crypto.ts                |
| `packages/shared/src/meta-crypto.spec.ts`                              | Tests for token encryption helpers                                         |
| `apps/web/src/features/channels/components/meta-oauth-button.tsx`      | "Conectar com Facebook" button — opens popup                               |
| `apps/web/src/features/channels/components/meta-asset-select.tsx`      | Sheet with Pages dropdown after OAuth                                      |
| `apps/web/src/features/channels/components/whatsapp-method-dialog.tsx` | (Phase 2) Dialog: QR Code vs Cloud API                                     |
| `apps/web/src/features/channels/components/meta-embedded-signup.tsx`   | (Phase 2) FB JS SDK loader + FB.login()                                    |
| `apps/web/src/features/channels/hooks/use-meta-oauth.ts`               | Hook: popup management, callback, asset fetching                           |

### Modified Files

| File                                                                 | Change                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `packages/env/src/index.ts`                                          | Add `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI`, `NEXT_PUBLIC_META_APP_ID`                   |
| `packages/db-chat/src/models/channel.model.ts`                       | Add `connectionMethod`, `metaUserId`, `tokenExpiresAt`, `scopes`, expand status enum                         |
| `packages/shared/src/chat-constants.ts`                              | Add `META_TOKEN_REFRESH` to `CHAT_QUEUES`                                                                    |
| `packages/shared/src/pino-redact.ts`                                 | Add Meta token/secret redaction paths                                                                        |
| `apps/chat-worker/src/messaging/broker-factory.ts`                   | Add token decryption before passing config to brokers                                                        |
| `apps/chat-server/src/infra/http/routes/webhook-routes.ts`           | Use `env.META_APP_SECRET` instead of per-channel lookup                                                      |
| `apps/chat-server/src/app.ts`                                        | Register `metaRoutes`                                                                                        |
| `apps/chat-worker/src/index.ts`                                      | Register `META_TOKEN_REFRESH` repeatable job                                                                 |
| `apps/web/src/features/channels/components/channels-page.tsx`        | Rewrite: cards + connected table                                                                             |
| `apps/web/src/features/channels/components/channel-status-badge.tsx` | Add TOKEN_EXPIRED, NEEDS_REAUTH                                                                              |
| `apps/web/src/features/channels/hooks/use-channels.ts`               | Add OAuth hooks: `useMetaAuthUrl`, `useMetaCallback`, `useMetaAssets`, `useMetaConnect`, `useMetaDisconnect` |
| `apps/web/src/features/channels/types/index.ts`                      | Add OAuth types                                                                                              |
| `.env.example`                                                       | Add Meta app env vars                                                                                        |

---

## Phase 1A — Crypto + Infra Base

### Task 1: Add Meta env vars + Pino redaction

**Files:**

- Modify: `packages/env/src/index.ts`
- Modify: `packages/shared/src/pino-redact.ts`
- Modify: `.env.example`
- Modify: `.env.example.prod`

- [ ] **Step 1: Add Meta env vars to `@repo/env`**

In `packages/env/src/index.ts`, add to the `server` object after `META_WEBHOOK_VERIFY_TOKEN`:

```typescript
    META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
    // Meta centralized app — OAuth + webhook HMAC
    META_APP_ID: z.string().min(1).optional(),
    META_APP_SECRET: z.string().min(1).optional(),
    META_OAUTH_REDIRECT_URI: z.string().url().optional(),
```

Add to the `client` object:

```typescript
    NEXT_PUBLIC_META_APP_ID: z.string().min(1).optional(),
```

- [ ] **Step 2: Add Pino redaction paths**

In `packages/shared/src/pino-redact.ts`, add to `PII_REDACT_PATHS` array:

```typescript
  // Meta OAuth tokens and secrets
  'metaToken',
  'access_token',
  'fb_exchange_token',
  'client_secret',
  'code',
  'config.metaToken',
  '*.metaToken',
  '*.access_token',
  '*.code',
  'body.code',
  'body.access_token',
  'body.metaToken',
  'req.body.code',
  'req.body.access_token',
```

- [ ] **Step 3: Update `.env.example`**

Add after the `META_WEBHOOK_VERIFY_TOKEN` line:

```bash
# === META CENTRALIZED APP (OAuth + Embedded Signup) ===
# META_APP_ID=your_facebook_app_id
# META_APP_SECRET=your_facebook_app_secret
# META_OAUTH_REDIRECT_URI=http://localhost:3002/meta/auth/callback
# NEXT_PUBLIC_META_APP_ID=your_facebook_app_id
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — no type errors

- [ ] **Step 5: Commit**

```bash
git add packages/env/src/index.ts packages/shared/src/pino-redact.ts .env.example
git commit -m "feat: add Meta centralized app env vars + Pino redaction paths"
```

---

### Task 2: Evolve Channel schema

**Files:**

- Modify: `packages/db-chat/src/models/channel.model.ts`

- [ ] **Step 1: Add new constants and fields**

Replace the `CHANNEL_STATUSES` constant and add `CONNECTION_METHODS`:

```typescript
const CHANNEL_STATUSES = [
  'CONNECTED',
  'DISCONNECTED',
  'QR_PENDING',
  'TOKEN_EXPIRED',
  'NEEDS_REAUTH',
] as const

const CONNECTION_METHODS = [
  'oauth',
  'embedded_signup',
  'qr_code',
  'manual',
] as const
```

Add new fields to the schema object (after `aiAgentId`):

```typescript
    aiAgentId: { type: String, default: null },
    connectionMethod: {
      type: String,
      enum: CONNECTION_METHODS,
      default: 'manual',
    },
    metaUserId: String,
    tokenExpiresAt: Date,
    scopes: { type: [String], default: [] },
    config: { type: Schema.Types.Mixed, default: {} },
```

- [ ] **Step 2: Add index for token refresh query**

After existing indexes, add:

```typescript
channelSchema.index({ connectionMethod: 1, status: 1, tokenExpiresAt: 1 })
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/db-chat/src/models/channel.model.ts
git commit -m "feat: add connectionMethod, metaUserId, tokenExpiresAt, scopes to Channel schema"
```

---

### Task 3: Token encryption helpers + tests

**Files:**

- Create: `packages/shared/src/meta-crypto.ts`
- Create: `packages/shared/src/meta-crypto.spec.ts`

- [ ] **Step 1: Write failing test**

Create `packages/shared/src/meta-crypto.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest'

import { decryptToken, encryptToken, isEncryptedField } from './meta-crypto.js'

describe('meta-crypto', () => {
  const sampleToken = 'EAABsbCS1iZAIBAJtZAQZB7example_token_here'

  it('encrypts and decrypts a token round-trip', () => {
    const encrypted = encryptToken(sampleToken)

    expect(encrypted).toHaveProperty('ciphertext')
    expect(encrypted).toHaveProperty('iv')
    expect(encrypted).toHaveProperty('tag')
    expect(encrypted.ciphertext).not.toBe(sampleToken)

    const decrypted = decryptToken(encrypted)
    expect(decrypted).toBe(sampleToken)
  })

  it('produces different ciphertexts for same plaintext (random IV)', () => {
    const a = encryptToken(sampleToken)
    const b = encryptToken(sampleToken)
    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(a.iv).not.toBe(b.iv)
  })

  it('isEncryptedField returns true for valid encrypted field', () => {
    const encrypted = encryptToken(sampleToken)
    expect(isEncryptedField(encrypted)).toBe(true)
  })

  it('isEncryptedField returns false for plain string', () => {
    expect(isEncryptedField(sampleToken)).toBe(false)
    expect(isEncryptedField(null)).toBe(false)
    expect(isEncryptedField(undefined)).toBe(false)
    expect(isEncryptedField({ ciphertext: 'a' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/shared exec vitest run src/meta-crypto.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

Create `packages/shared/src/meta-crypto.ts`:

```typescript
import {
  type EncryptedField,
  decrypt,
  encrypt,
  getEncryptionKey,
} from './crypto.js'

export type { EncryptedField }

export function encryptToken(plainToken: string): EncryptedField {
  return encrypt(plainToken, getEncryptionKey())
}

export function decryptToken(encrypted: EncryptedField): string {
  return decrypt(encrypted, getEncryptionKey())
}

export function isEncryptedField(value: unknown): value is EncryptedField {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj['ciphertext'] === 'string' &&
    typeof obj['iv'] === 'string' &&
    typeof obj['tag'] === 'string'
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/shared exec vitest run src/meta-crypto.spec.ts`
Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/meta-crypto.ts packages/shared/src/meta-crypto.spec.ts
git commit -m "feat: add encryptToken/decryptToken helpers with tests"
```

---

### Task 4: Broker factory decrypt + webhook HMAC global secret

**Files:**

- Modify: `apps/chat-worker/src/messaging/broker-factory.ts`
- Modify: `apps/chat-server/src/infra/http/routes/webhook-routes.ts`

- [ ] **Step 1: Add decrypt to broker factory**

In `apps/chat-worker/src/messaging/broker-factory.ts`, add import at top:

```typescript
import { decryptToken, isEncryptedField } from '@repo/shared/meta-crypto'
```

Add a helper function before `createBroker`:

```typescript
function decryptConfigToken(
  config: Record<string, unknown>
): Record<string, unknown> {
  const metaToken = config['metaToken']
  if (isEncryptedField(metaToken)) {
    return { ...config, metaToken: decryptToken(metaToken) }
  }
  return config
}
```

Update the META, MESSENGER, and INSTAGRAM cases to decrypt:

```typescript
    case 'META':
      return new MetaBroker(decryptConfigToken(config))
    case 'MESSENGER':
      return new MessengerBroker(decryptConfigToken(config))
    case 'INSTAGRAM':
      return new InstagramBroker(decryptConfigToken(config))
```

- [ ] **Step 2: Simplify webhook HMAC validation**

In `apps/chat-server/src/infra/http/routes/webhook-routes.ts`, replace the `findChannelByAccountId` function's HMAC logic.

Find the POST `/chat/webhook/meta` handler. Replace the section that looks up per-channel appSecret with global secret validation. The HMAC validation should happen BEFORE parsing the body for channel lookup.

Replace the webhook POST handler logic to:

1. Validate HMAC using `env.META_APP_SECRET` immediately (before JSON parse for channel lookup)
2. If `META_APP_SECRET` is not set, fall back to per-channel lookup (backwards compat during transition)
3. Remove the `findChannelByAccountId` function's `appSecret` return — it's no longer needed for HMAC

The key change in the POST handler:

```typescript
// Validate HMAC with global app secret first
const globalAppSecret = env.META_APP_SECRET
if (globalAppSecret) {
  const isValid = validateHmacSignature(
    rawBody,
    signatureHeader,
    globalAppSecret
  )
  if (!isValid) {
    app.log.warn('Meta webhook HMAC validation failed (global secret)')
    return reply.status(401).send({
      success: false,
      error: { code: 'INVALID_SIGNATURE', message: 'Invalid HMAC signature' },
    })
  }
}
```

Then simplify `findChannelByAccountId` to only return `channelId` and `tenantId` (no `appSecret`). If `globalAppSecret` is not set, keep the existing per-channel HMAC as fallback.

- [ ] **Step 3: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/chat-worker/src/messaging/broker-factory.ts apps/chat-server/src/infra/http/routes/webhook-routes.ts
git commit -m "feat: decrypt tokens in broker factory, use global META_APP_SECRET for webhook HMAC"
```

---

### Task 5: Add META_TOKEN_REFRESH queue constant

**Files:**

- Modify: `packages/shared/src/chat-constants.ts`

- [ ] **Step 1: Add queue constant**

In `packages/shared/src/chat-constants.ts`, add to `CHAT_QUEUES`:

```typescript
  META_TOKEN_REFRESH: 'chat-meta-token-refresh',
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/chat-constants.ts
git commit -m "feat: add META_TOKEN_REFRESH queue constant"
```

---

## Phase 1B — Facebook Login OAuth (Messenger + Instagram)

### Task 6: Meta OAuth service (backend)

**Files:**

- Create: `apps/chat-server/src/infra/http/routes/meta-oauth-service.ts`

- [ ] **Step 1: Create OAuth service**

Create `apps/chat-server/src/infra/http/routes/meta-oauth-service.ts`:

```typescript
import { randomBytes } from 'node:crypto'
import { env } from '@repo/env'
import { encrypt, decrypt, getEncryptionKey } from '@repo/shared/crypto'

const META_GRAPH_API = 'https://graph.facebook.com/v21.0'
const META_OAUTH_BASE = 'https://www.facebook.com/v21.0/dialog/oauth'

interface OAuthState {
  tenantId: string
  channelType: string
  nonce: string
  expiresAt: number
}

interface TokenExchangeResult {
  accessToken: string
  expiresIn: number
  tokenType: string
}

export function generateOAuthUrl(
  tenantId: string,
  channelType: string
): {
  url: string
  state: string
} {
  const appId = env.META_APP_ID
  const redirectUri = env.META_OAUTH_REDIRECT_URI
  if (!appId || !redirectUri) {
    throw new Error(
      'META_APP_ID and META_OAUTH_REDIRECT_URI must be configured'
    )
  }

  const statePayload: OAuthState = {
    tenantId,
    channelType,
    nonce: randomBytes(16).toString('hex'),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
  }

  const key = getEncryptionKey()
  const encrypted = encrypt(JSON.stringify(statePayload), key)
  const state = Buffer.from(JSON.stringify(encrypted)).toString('base64url')

  const scopes = [
    'pages_messaging',
    'pages_manage_metadata',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_messages',
  ].join(',')

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: 'code',
  })

  return { url: `${META_OAUTH_BASE}?${params.toString()}`, state }
}

export function validateState(stateParam: string): OAuthState {
  const key = getEncryptionKey()
  const encryptedJson = Buffer.from(stateParam, 'base64url').toString('utf8')
  const encrypted = JSON.parse(encryptedJson) as {
    ciphertext: string
    iv: string
    tag: string
  }

  const decrypted = decrypt(encrypted, key)
  const payload = JSON.parse(decrypted) as OAuthState

  if (payload.expiresAt < Date.now()) {
    throw new Error('OAuth state expired')
  }

  return payload
}

export async function exchangeCodeForToken(
  code: string
): Promise<TokenExchangeResult> {
  const appId = env.META_APP_ID
  const appSecret = env.META_APP_SECRET
  const redirectUri = env.META_OAUTH_REDIRECT_URI
  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      'META_APP_ID, META_APP_SECRET, META_OAUTH_REDIRECT_URI must be configured'
    )
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  })

  const response = await fetch(
    `${META_GRAPH_API}/oauth/access_token?${params.toString()}`
  )
  const data = (await response.json()) as Record<string, unknown>

  if (!response.ok || typeof data['error'] === 'object') {
    const err = data['error'] as Record<string, unknown> | undefined
    throw new Error(
      `Meta token exchange failed: ${err?.['message'] ?? 'Unknown error'}`
    )
  }

  return {
    accessToken: data['access_token'] as string,
    expiresIn: (data['expires_in'] as number) ?? 0,
    tokenType: (data['token_type'] as string) ?? 'bearer',
  }
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<TokenExchangeResult> {
  const appId = env.META_APP_ID
  const appSecret = env.META_APP_SECRET
  if (!appId || !appSecret) {
    throw new Error('META_APP_ID and META_APP_SECRET must be configured')
  }

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  })

  const response = await fetch(
    `${META_GRAPH_API}/oauth/access_token?${params.toString()}`
  )
  const data = (await response.json()) as Record<string, unknown>

  if (!response.ok || typeof data['error'] === 'object') {
    const err = data['error'] as Record<string, unknown> | undefined
    throw new Error(
      `Meta long-lived token exchange failed: ${err?.['message'] ?? 'Unknown error'}`
    )
  }

  return {
    accessToken: data['access_token'] as string,
    expiresIn: (data['expires_in'] as number) ?? 5184000, // default 60 days
    tokenType: (data['token_type'] as string) ?? 'bearer',
  }
}

export async function refreshLongLivedToken(
  currentToken: string
): Promise<TokenExchangeResult> {
  return exchangeForLongLivedToken(currentToken)
}

export async function revokePermissions(
  userAccessToken: string
): Promise<boolean> {
  const response = await fetch(`${META_GRAPH_API}/me/permissions`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userAccessToken}` },
  })

  const data = (await response.json()) as Record<string, unknown>
  return data['success'] === true
}

export async function getMetaUserId(accessToken: string): Promise<string> {
  const response = await fetch(
    `${META_GRAPH_API}/me?access_token=${accessToken}`
  )
  const data = (await response.json()) as Record<string, unknown>

  if (!response.ok) {
    throw new Error('Failed to fetch Meta user ID')
  }

  return data['id'] as string
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/chat-server/src/infra/http/routes/meta-oauth-service.ts
git commit -m "feat: add meta-oauth-service with URL gen, state, code/token exchange, revoke"
```

---

### Task 7: Meta assets service (backend)

**Files:**

- Create: `apps/chat-server/src/infra/http/routes/meta-assets-service.ts`

- [ ] **Step 1: Create assets service**

Create `apps/chat-server/src/infra/http/routes/meta-assets-service.ts`:

```typescript
import { z } from 'zod'

const META_GRAPH_API = 'https://graph.facebook.com/v21.0'

const instagramAccountSchema = z.object({
  id: z.string(),
})

const pageSchema = z.object({
  id: z.string(),
  name: z.string(),
  access_token: z.string(),
  instagram_business_account: instagramAccountSchema.optional(),
})

const pagesResponseSchema = z.object({
  data: z.array(pageSchema),
  paging: z
    .object({
      cursors: z
        .object({
          before: z.string().optional(),
          after: z.string().optional(),
        })
        .optional(),
      next: z.string().optional(),
    })
    .optional(),
})

export interface MetaPage {
  id: string
  name: string
  accessToken: string
  instagramBusinessAccountId: string | null
}

export interface MetaAsset {
  pageId: string
  pageName: string
  hasInstagram: boolean
  instagramAccountId: string | null
}

export async function fetchUserPages(
  userAccessToken: string
): Promise<MetaPage[]> {
  const fields = 'id,name,access_token,instagram_business_account'
  const url = `${META_GRAPH_API}/me/accounts?fields=${fields}&access_token=${userAccessToken}&limit=100`

  const response = await fetch(url)
  const raw: unknown = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch user pages from Meta')
  }

  const parsed = pagesResponseSchema.parse(raw)

  return parsed.data.map((page) => ({
    id: page.id,
    name: page.name,
    accessToken: page.access_token,
    instagramBusinessAccountId: page.instagram_business_account?.id ?? null,
  }))
}

export function mapPagesToAssets(pages: MetaPage[]): MetaAsset[] {
  return pages.map((page) => ({
    pageId: page.id,
    pageName: page.name,
    hasInstagram: page.instagramBusinessAccountId !== null,
    instagramAccountId: page.instagramBusinessAccountId,
  }))
}

export async function getInstagramUsername(
  instagramAccountId: string,
  pageAccessToken: string
): Promise<string | null> {
  const url = `${META_GRAPH_API}/${instagramAccountId}?fields=username&access_token=${pageAccessToken}`
  const response = await fetch(url)

  if (!response.ok) return null

  const data = (await response.json()) as Record<string, unknown>
  return (data['username'] as string) ?? null
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/chat-server/src/infra/http/routes/meta-assets-service.ts
git commit -m "feat: add meta-assets-service with page/instagram discovery"
```

---

### Task 8: Meta connect service (backend)

**Files:**

- Create: `apps/chat-server/src/infra/http/routes/meta-connect-service.ts`

- [ ] **Step 1: Create connect service**

Create `apps/chat-server/src/infra/http/routes/meta-connect-service.ts`:

```typescript
import { Channel } from '@repo/db-chat'
import {
  encryptToken,
  decryptToken,
  isEncryptedField,
} from '@repo/shared/meta-crypto'

const META_GRAPH_API = 'https://graph.facebook.com/v21.0'

interface ConnectChannelInput {
  tenantId: string
  channelType: 'MESSENGER' | 'INSTAGRAM'
  name: string
  pageId: string
  pageAccessToken: string
  metaUserId: string
  scopes: string[]
  tokenExpiresAt: Date
  instagramAccountId?: string
}

interface ConnectResult {
  channelId: string
  name: string
  type: string
  status: string
}

export async function connectMetaChannel(
  input: ConnectChannelInput
): Promise<ConnectResult> {
  const encryptedToken = encryptToken(input.pageAccessToken)

  const brokerType =
    input.channelType === 'MESSENGER' ? 'MESSENGER' : 'INSTAGRAM'

  const channel = await Channel.create({
    tenantId: input.tenantId,
    name: input.name,
    type: input.channelType,
    brokerType,
    isActive: true,
    status: 'CONNECTED',
    lastConnectedAt: new Date(),
    connectionMethod: 'oauth',
    metaUserId: input.metaUserId,
    tokenExpiresAt: input.tokenExpiresAt,
    scopes: input.scopes,
    config: {
      metaPageId: input.pageId,
      metaToken: encryptedToken,
      ...(input.instagramAccountId
        ? { metaInstagramAccountId: input.instagramAccountId }
        : {}),
    },
  })

  return {
    channelId: String(channel._id),
    name: channel.name,
    type: channel.type as string,
    status: channel.status as string,
  }
}

export async function subscribePageToWebhooks(
  pageId: string,
  pageAccessToken: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${META_GRAPH_API}/${pageId}/subscribed_apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscribed_fields: 'messages,messaging_postbacks',
      access_token: pageAccessToken,
    }),
  })

  const data = (await response.json()) as Record<string, unknown>

  if (!response.ok) {
    const err = data['error'] as Record<string, unknown> | undefined
    return {
      success: false,
      error: (err?.['message'] as string) ?? 'Failed to subscribe page',
    }
  }

  return { success: true }
}

export async function disconnectMetaChannel(
  channelId: string,
  tenantId: string
): Promise<boolean> {
  const channel = await Channel.findOne({
    _id: channelId,
    tenantId,
    isActive: true,
  })

  if (!channel) return false

  const config = channel.config as Record<string, unknown> | undefined
  const metaToken = config?.['metaToken']

  // Revoke permissions if we have a valid token
  if (metaToken && isEncryptedField(metaToken)) {
    const plainToken = decryptToken(metaToken)
    await fetch(`${META_GRAPH_API}/me/permissions`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${plainToken}` },
    }).catch(() => {
      // Best effort — token may already be invalid
    })
  }

  await Channel.updateOne(
    { _id: channelId, tenantId },
    {
      $set: {
        isActive: false,
        status: 'DISCONNECTED',
        'config.metaToken': null,
      },
    }
  )

  return true
}

export async function getChannelMetaStatus(
  channelId: string,
  tenantId: string
): Promise<{
  status: string
  connectionMethod: string
  tokenExpiresAt: Date | null
  scopes: string[]
} | null> {
  const channel = await Channel.findOne({ _id: channelId, tenantId }).lean()
  if (!channel) return null

  return {
    status: channel.status as string,
    connectionMethod:
      ((channel as Record<string, unknown>)['connectionMethod'] as string) ??
      'manual',
    tokenExpiresAt:
      ((channel as Record<string, unknown>)['tokenExpiresAt'] as Date | null) ??
      null,
    scopes: ((channel as Record<string, unknown>)['scopes'] as string[]) ?? [],
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/chat-server/src/infra/http/routes/meta-connect-service.ts
git commit -m "feat: add meta-connect-service with connect, disconnect, subscribe, status"
```

---

### Task 9: Meta routes (Fastify endpoints)

**Files:**

- Create: `apps/chat-server/src/infra/http/routes/meta-routes.ts`
- Modify: `apps/chat-server/src/app.ts`

- [ ] **Step 1: Create route plugin**

Create `apps/chat-server/src/infra/http/routes/meta-routes.ts`:

```typescript
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { randomBytes } from 'node:crypto'
import Redis from 'ioredis'
import { z } from 'zod'

import { env } from '@repo/env'

import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  generateOAuthUrl,
  getMetaUserId,
  validateState,
} from './meta-oauth-service.js'
import {
  fetchUserPages,
  getInstagramUsername,
  mapPagesToAssets,
} from './meta-assets-service.js'
import {
  connectMetaChannel,
  disconnectMetaChannel,
  getChannelMetaStatus,
  subscribePageToWebhooks,
} from './meta-connect-service.js'

const authUrlQuerySchema = z.object({
  channelType: z.enum(['MESSENGER', 'INSTAGRAM']),
})

const callbackBodySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

const assetsQuerySchema = z.object({
  sessionId: z.string().min(1),
})

const connectBodySchema = z.object({
  sessionId: z.string().min(1),
  pageId: z.string().min(1),
  channelType: z.enum(['MESSENGER', 'INSTAGRAM']),
  name: z.string().min(1).max(255),
  instagramAccountId: z.string().optional(),
})

const channelIdParamSchema = z.object({
  channelId: z.string().min(1),
})

// Reuse the chat-server Redis connection
let redis: Redis | null = null
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 })
  }
  return redis
}

const SESSION_TTL = 600 // 10 minutes
const SESSION_PREFIX = 'meta:oauth:'

interface OAuthSession {
  longLivedToken: string
  metaUserId: string
  expiresIn: number
  tenantId: string
  channelType: string
  pages: Array<{
    id: string
    name: string
    accessToken: string
    instagramBusinessAccountId: string | null
  }>
}

export async function metaRoutes(app: FastifyInstance): Promise<void> {
  // GET /meta/auth/url — Generate Facebook Login URL
  app.get(
    '/meta/auth/url',
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof authUrlQuerySchema>
      }>,
      reply: FastifyReply
    ) => {
      const parsed = authUrlQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'channelType is required (MESSENGER or INSTAGRAM)',
          },
        })
      }

      const tenantId = request.organizationId
      const { url, state } = generateOAuthUrl(tenantId, parsed.data.channelType)

      return reply.send({ success: true, data: { url, state } })
    }
  )

  // POST /meta/auth/callback — Exchange code for long-lived token
  app.post(
    '/meta/auth/callback',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof callbackBodySchema> }>,
      reply: FastifyReply
    ) => {
      const parsed = callbackBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'code and state are required',
          },
        })
      }

      const { code, state } = parsed.data
      const tenantId = request.organizationId

      // Validate state
      let statePayload: ReturnType<typeof validateState>
      try {
        statePayload = validateState(state)
      } catch {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: 'OAuth state is invalid or expired',
          },
        })
      }

      if (statePayload.tenantId !== tenantId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'TENANT_MISMATCH',
            message: 'OAuth state tenant mismatch',
          },
        })
      }

      // Exchange code for short-lived token
      let shortLived: Awaited<ReturnType<typeof exchangeCodeForToken>>
      try {
        shortLived = await exchangeCodeForToken(code)
      } catch (err) {
        app.log.warn({ err }, 'Meta code exchange failed')
        return reply.status(422).send({
          success: false,
          error: {
            code: 'CODE_EXCHANGE_FAILED',
            message: 'Failed to exchange authorization code',
          },
        })
      }

      // Exchange for long-lived token
      let longLived: Awaited<ReturnType<typeof exchangeForLongLivedToken>>
      try {
        longLived = await exchangeForLongLivedToken(shortLived.accessToken)
      } catch (err) {
        app.log.warn({ err }, 'Meta long-lived token exchange failed')
        return reply.status(422).send({
          success: false,
          error: {
            code: 'TOKEN_EXCHANGE_FAILED',
            message: 'Failed to exchange for long-lived token',
          },
        })
      }

      // Get Meta user ID
      const metaUserId = await getMetaUserId(longLived.accessToken)

      // Fetch pages to store in session
      const pages = await fetchUserPages(longLived.accessToken)

      // Save session in Redis
      const sessionId = randomBytes(16).toString('hex')
      const session: OAuthSession = {
        longLivedToken: longLived.accessToken,
        metaUserId,
        expiresIn: longLived.expiresIn,
        tenantId,
        channelType: statePayload.channelType,
        pages,
      }

      await getRedis().set(
        `${SESSION_PREFIX}${sessionId}`,
        JSON.stringify(session),
        'EX',
        SESSION_TTL
      )

      app.log.info(
        {
          event: 'meta.oauth.callback_success',
          tenantId,
          metaUserId,
          pageCount: pages.length,
        },
        'Meta OAuth callback successful'
      )

      return reply.send({ success: true, data: { sessionId } })
    }
  )

  // GET /meta/assets — List available Pages/Instagram accounts
  app.get(
    '/meta/assets',
    async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof assetsQuerySchema>
      }>,
      reply: FastifyReply
    ) => {
      const parsed = assetsQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'sessionId is required' },
        })
      }

      const tenantId = request.organizationId
      const sessionRaw = await getRedis().get(
        `${SESSION_PREFIX}${parsed.data.sessionId}`
      )
      if (!sessionRaw) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SESSION_EXPIRED',
            message: 'OAuth session expired. Please reconnect.',
          },
        })
      }

      const session = JSON.parse(sessionRaw) as OAuthSession
      if (session.tenantId !== tenantId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'TENANT_MISMATCH',
            message: 'Session does not belong to this tenant',
          },
        })
      }

      const assets = mapPagesToAssets(session.pages)

      // Enrich with Instagram usernames
      const enriched = await Promise.all(
        assets.map(async (asset) => {
          if (!asset.hasInstagram || !asset.instagramAccountId) return asset
          const page = session.pages.find((p) => p.id === asset.pageId)
          if (!page) return asset
          const username = await getInstagramUsername(
            asset.instagramAccountId,
            page.accessToken
          )
          return { ...asset, instagramUsername: username }
        })
      )

      return reply.send({ success: true, data: { assets: enriched } })
    }
  )

  // POST /meta/connect — Connect a Page/Instagram to a channel
  app.post(
    '/meta/connect',
    async (
      request: FastifyRequest<{ Body: z.infer<typeof connectBodySchema> }>,
      reply: FastifyReply
    ) => {
      const parsed = connectBodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'sessionId, pageId, channelType, name are required',
          },
        })
      }

      const tenantId = request.organizationId
      const { sessionId, pageId, channelType, name, instagramAccountId } =
        parsed.data

      // Get session
      const sessionRaw = await getRedis().get(`${SESSION_PREFIX}${sessionId}`)
      if (!sessionRaw) {
        return reply.status(404).send({
          success: false,
          error: { code: 'SESSION_EXPIRED', message: 'OAuth session expired' },
        })
      }

      const session = JSON.parse(sessionRaw) as OAuthSession
      if (session.tenantId !== tenantId) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'TENANT_MISMATCH',
            message: 'Session does not belong to this tenant',
          },
        })
      }

      // Find the selected page
      const page = session.pages.find((p) => p.id === pageId)
      if (!page) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'PAGE_NOT_FOUND',
            message: 'Selected page not found in session',
          },
        })
      }

      // Subscribe page to webhooks
      const subscribeResult = await subscribePageToWebhooks(
        pageId,
        page.accessToken
      )
      if (!subscribeResult.success) {
        app.log.warn(
          { pageId, error: subscribeResult.error },
          'Failed to subscribe page to webhooks'
        )
      }

      // Calculate token expiry
      const tokenExpiresAt = new Date(Date.now() + session.expiresIn * 1000)

      // Create channel
      const scopes = [
        'pages_messaging',
        'pages_manage_metadata',
        'pages_read_engagement',
        'instagram_basic',
        'instagram_manage_messages',
      ]

      const result = await connectMetaChannel({
        tenantId,
        channelType,
        name,
        pageId,
        pageAccessToken: page.accessToken,
        metaUserId: session.metaUserId,
        scopes,
        tokenExpiresAt,
        instagramAccountId:
          instagramAccountId ?? page.instagramBusinessAccountId ?? undefined,
      })

      // Clean up session
      await getRedis().del(`${SESSION_PREFIX}${sessionId}`)

      app.log.info(
        {
          event: 'meta.channel.connected',
          tenantId,
          channelId: result.channelId,
          channelType,
          connectionMethod: 'oauth',
          pageId,
          scopes,
        },
        'Meta channel connected'
      )

      return reply.status(201).send({
        success: true,
        data: {
          channel: result,
          webhookSubscription: subscribeResult.success
            ? 'subscribed'
            : `failed: ${subscribeResult.error}`,
        },
      })
    }
  )

  // POST /meta/disconnect — Disconnect a Meta channel
  app.post(
    '/meta/disconnect',
    async (
      request: FastifyRequest<{ Body: { channelId: string } }>,
      reply: FastifyReply
    ) => {
      const channelId = (request.body as Record<string, unknown>)?.['channelId']
      if (typeof channelId !== 'string') {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'channelId is required' },
        })
      }

      const tenantId = request.organizationId
      const success = await disconnectMetaChannel(channelId, tenantId)

      if (!success) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'CHANNEL_NOT_FOUND',
            message: 'Channel not found or already disconnected',
          },
        })
      }

      app.log.info(
        {
          event: 'meta.channel.disconnected',
          tenantId,
          channelId,
          revokedPermissions: true,
        },
        'Meta channel disconnected'
      )

      return reply.send({ success: true, data: { disconnected: true } })
    }
  )

  // GET /meta/status/:channelId — Integration status
  app.get(
    '/meta/status/:channelId',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof channelIdParamSchema> }>,
      reply: FastifyReply
    ) => {
      const parsed = channelIdParamSchema.safeParse(request.params)
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'channelId is required' },
        })
      }

      const tenantId = request.organizationId
      const status = await getChannelMetaStatus(parsed.data.channelId, tenantId)

      if (!status) {
        return reply.status(404).send({
          success: false,
          error: { code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' },
        })
      }

      return reply.send({ success: true, data: status })
    }
  )

  // POST /meta/reconnect/:channelId — Re-auth when token expired
  app.post(
    '/meta/reconnect/:channelId',
    async (
      request: FastifyRequest<{ Params: z.infer<typeof channelIdParamSchema> }>,
      reply: FastifyReply
    ) => {
      const parsed = channelIdParamSchema.safeParse(request.params)
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'channelId is required' },
        })
      }

      // Reconnect works like a new auth — return the OAuth URL
      // The frontend will re-do the OAuth flow and call /meta/connect
      const tenantId = request.organizationId
      const status = await getChannelMetaStatus(parsed.data.channelId, tenantId)
      if (!status) {
        return reply.status(404).send({
          success: false,
          error: { code: 'CHANNEL_NOT_FOUND', message: 'Channel not found' },
        })
      }

      const channelType =
        status.status === 'MESSENGER' ? 'MESSENGER' : 'INSTAGRAM'
      const { url, state } = generateOAuthUrl(tenantId, channelType)

      return reply.send({
        success: true,
        data: { url, state, channelId: parsed.data.channelId },
      })
    }
  )
}
```

- [ ] **Step 2: Register routes in app.ts**

In `apps/chat-server/src/app.ts`, add import:

```typescript
import { metaRoutes } from './infra/http/routes/meta-routes.js'
```

Register after the `channelRoutes` line (in the authenticated routes section):

```typescript
await app.register(metaRoutes)
```

- [ ] **Step 3: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/chat-server/src/infra/http/routes/meta-routes.ts apps/chat-server/src/app.ts
git commit -m "feat: add /meta/* routes — OAuth URL, callback, assets, connect, disconnect, status, reconnect"
```

---

### Task 10: Token refresh cron job

**Files:**

- Modify: `apps/chat-worker/src/index.ts`

- [ ] **Step 1: Add token refresh processor and repeatable job**

In `apps/chat-worker/src/index.ts`, add imports:

```typescript
import { Channel } from '@repo/db-chat'
import {
  decryptToken,
  encryptToken,
  isEncryptedField,
} from '@repo/shared/meta-crypto'
```

Add processor function (before the `main()` or startup logic):

```typescript
async function processMetaTokenRefresh(): Promise<void> {
  const logger = pino({ name: 'meta-token-refresh' })

  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const channels = await Channel.find({
    connectionMethod: 'oauth',
    status: 'CONNECTED',
    isActive: true,
    tokenExpiresAt: { $lt: sevenDaysFromNow },
  }).lean()

  logger.info(
    { count: channels.length },
    'Found channels needing token refresh'
  )

  for (const channel of channels) {
    const config = channel.config as Record<string, unknown> | undefined
    const metaToken = config?.['metaToken']

    if (!metaToken || !isEncryptedField(metaToken)) {
      logger.warn(
        { channelId: String(channel._id) },
        'Channel missing encrypted token'
      )
      continue
    }

    try {
      const currentToken = decryptToken(metaToken)

      const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: env.META_APP_ID ?? '',
        client_secret: env.META_APP_SECRET ?? '',
        fb_exchange_token: currentToken,
      })

      const response = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?${params.toString()}`
      )
      const data = (await response.json()) as Record<string, unknown>

      if (!response.ok || typeof data['error'] === 'object') {
        const err = data['error'] as Record<string, unknown> | undefined
        logger.warn(
          {
            event: 'meta.token.refresh_failed',
            channelId: String(channel._id),
            tenantId: channel.tenantId,
            errorCode: err?.['code'],
            errorMessage: err?.['message'],
          },
          'Token refresh failed'
        )

        await Channel.updateOne(
          { _id: channel._id },
          { $set: { status: 'TOKEN_EXPIRED' } }
        )
        continue
      }

      const newToken = data['access_token'] as string
      const expiresIn = (data['expires_in'] as number) ?? 5184000
      const newExpiresAt = new Date(Date.now() + expiresIn * 1000)
      const encrypted = encryptToken(newToken)

      await Channel.updateOne(
        { _id: channel._id },
        {
          $set: {
            'config.metaToken': encrypted,
            tokenExpiresAt: newExpiresAt,
          },
        }
      )

      logger.info(
        {
          event: 'meta.token.refreshed',
          channelId: String(channel._id),
          tenantId: channel.tenantId,
          newExpiresAt: newExpiresAt.toISOString(),
        },
        'Token refreshed successfully'
      )
    } catch (err) {
      logger.error(
        { channelId: String(channel._id), err },
        'Unexpected error during token refresh'
      )
    }
  }
}
```

In the startup section where workers are created, add the repeatable job:

```typescript
// Meta token refresh — daily at 3 AM
const tokenRefreshQueue = new Queue(CHAT_QUEUES.META_TOKEN_REFRESH, {
  connection: bullmqConnection,
})

await tokenRefreshQueue.add(
  'refresh',
  {},
  {
    repeat: { pattern: '0 3 * * *' },
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 50 },
  }
)

const tokenRefreshWorker = new Worker(
  CHAT_QUEUES.META_TOKEN_REFRESH,
  async () => processMetaTokenRefresh(),
  { ...workerDefaults, concurrency: 1 }
)

tokenRefreshWorker.on('error', (err) => {
  logger.error(
    { err, queue: CHAT_QUEUES.META_TOKEN_REFRESH },
    'Token refresh worker error'
  )
})
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/chat-worker/src/index.ts
git commit -m "feat: add Meta token refresh BullMQ cron job (daily 3AM, 7-day lookahead)"
```

---

### Task 11: Frontend — channel types + OAuth hooks

**Files:**

- Modify: `apps/web/src/features/channels/types/index.ts`
- Modify: `apps/web/src/features/channels/hooks/use-channels.ts`
- Create: `apps/web/src/features/channels/hooks/use-meta-oauth.ts`

- [ ] **Step 1: Update types**

In `apps/web/src/features/channels/types/index.ts`, add/update:

```typescript
export type ChannelStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'QR_PENDING'
  | 'TOKEN_EXPIRED'
  | 'NEEDS_REAUTH'

export type ConnectionMethod =
  | 'oauth'
  | 'embedded_signup'
  | 'qr_code'
  | 'manual'

export interface MetaAsset {
  pageId: string
  pageName: string
  hasInstagram: boolean
  instagramAccountId: string | null
  instagramUsername?: string | null
}
```

- [ ] **Step 2: Create use-meta-oauth hook**

Create `apps/web/src/features/channels/hooks/use-meta-oauth.ts`:

```typescript
'use client'

import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { chatApi, ChatApiError } from '@/features/chat/lib/chat-api'

import type { MetaAsset } from '../types'

interface AuthUrlResponse {
  url: string
  state: string
}

interface CallbackResponse {
  sessionId: string
}

interface AssetsResponse {
  assets: MetaAsset[]
}

interface ConnectResponse {
  channel: {
    channelId: string
    name: string
    type: string
    status: string
  }
  webhookSubscription: string
}

type OAuthStep =
  | 'idle'
  | 'authenticating'
  | 'selecting'
  | 'connecting'
  | 'done'
  | 'error'

export function useMetaOAuth() {
  const [step, setStep] = useState<OAuthStep>('idle')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [assets, setAssets] = useState<MetaAsset[]>([])
  const popupRef = useRef<Window | null>(null)

  const startOAuth = useCallback(
    async (channelType: 'MESSENGER' | 'INSTAGRAM') => {
      setStep('authenticating')

      try {
        const { data } = await chatApi.get<AuthUrlResponse>(
          `/meta/auth/url?channelType=${channelType}`
        )

        // Open popup
        const popup = window.open(
          data.url,
          'meta-oauth',
          'width=600,height=700,scrollbars=yes'
        )
        popupRef.current = popup

        // Poll for popup close (Meta redirects back with code in URL)
        const pollInterval = setInterval(() => {
          if (!popup || popup.closed) {
            clearInterval(pollInterval)
            // The callback page will post a message back
          }
        }, 500)
      } catch (err) {
        setStep('error')
        toast.error('Erro ao iniciar conexão com Facebook')
      }
    },
    []
  )

  const handleCallback = useCallback(async (code: string, state: string) => {
    try {
      const { data } = await chatApi.post<CallbackResponse>(
        '/meta/auth/callback',
        {
          code,
          state,
        }
      )
      setSessionId(data.sessionId)

      // Fetch assets
      const assetsResponse = await chatApi.get<AssetsResponse>(
        `/meta/assets?sessionId=${data.sessionId}`
      )
      setAssets(assetsResponse.data.assets)
      setStep('selecting')
    } catch (err) {
      setStep('error')
      const msg =
        err instanceof ChatApiError
          ? err.message
          : 'Erro ao processar autorização'
      toast.error(msg)
    }
  }, [])

  const connectChannel = useCallback(
    async (input: {
      pageId: string
      channelType: 'MESSENGER' | 'INSTAGRAM'
      name: string
      instagramAccountId?: string
    }) => {
      if (!sessionId) return

      setStep('connecting')
      try {
        const { data } = await chatApi.post<ConnectResponse>('/meta/connect', {
          sessionId,
          ...input,
        })
        setStep('done')
        toast.success(`Canal "${input.name}" conectado com sucesso`)
        return data.channel
      } catch (err) {
        setStep('error')
        const msg =
          err instanceof ChatApiError ? err.message : 'Erro ao conectar canal'
        toast.error(msg)
      }
    },
    [sessionId]
  )

  const reset = useCallback(() => {
    setStep('idle')
    setSessionId(null)
    setAssets([])
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close()
    }
  }, [])

  return {
    step,
    assets,
    startOAuth,
    handleCallback,
    connectChannel,
    reset,
  }
}
```

- [ ] **Step 3: Add disconnect hook to use-channels.ts**

In `apps/web/src/features/channels/hooks/use-channels.ts`, add:

```typescript
export function useDisconnectMetaChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await chatApi.post<{ disconnected: boolean }>(
        '/meta/disconnect',
        { channelId }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CHANNELS_KEY] })
      toast.success('Canal desconectado com sucesso')
    },
    onError: (error: unknown) => {
      const msg =
        error instanceof ChatApiError
          ? error.message
          : 'Erro ao desconectar canal'
      toast.error(msg)
    },
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/channels/types/index.ts apps/web/src/features/channels/hooks/use-meta-oauth.ts apps/web/src/features/channels/hooks/use-channels.ts
git commit -m "feat: add Meta OAuth types, use-meta-oauth hook, disconnect mutation"
```

---

### Task 12: Frontend — channels page rewrite + status badge

**Files:**

- Modify: `apps/web/src/features/channels/components/channels-page.tsx`
- Modify: `apps/web/src/features/channels/components/channel-status-badge.tsx`
- Create: `apps/web/src/features/channels/components/meta-oauth-button.tsx`
- Create: `apps/web/src/features/channels/components/meta-asset-select.tsx`

This is the largest frontend task. The implementing agent should:

- [ ] **Step 1: Update `channel-status-badge.tsx`**

Add `TOKEN_EXPIRED` and `NEEDS_REAUTH` to the status map with appropriate colors:

- `TOKEN_EXPIRED` → yellow/warning variant with label "Token Expirado"
- `NEEDS_REAUTH` → red/destructive variant with label "Reautenticação Necessária"

- [ ] **Step 2: Create `meta-oauth-button.tsx`**

A button component that:

- Accepts `channelType: 'MESSENGER' | 'INSTAGRAM'` and `onCallback: (code, state) => void`
- Renders a styled button with Facebook icon and "Conectar com Facebook" label
- Opens the OAuth popup when clicked using `useMetaOAuth().startOAuth`
- Shows loading state during authentication

- [ ] **Step 3: Create `meta-asset-select.tsx`**

A Sheet/Dialog component that:

- Accepts `assets: MetaAsset[]`, `channelType`, `onConnect: (pageId, name, igId?) => void`, `onCancel`
- Shows a radio list of available Pages with Instagram info if present
- Auto-fills channel name from selected page name
- Has a name text input (editable, pre-filled)
- Shows "Conectar" and "Cancelar" buttons
- For Instagram channels, only shows pages that have `hasInstagram: true`

- [ ] **Step 4: Rewrite `channels-page.tsx`**

Replace the current form-based page with:

1. **Channel cards section** — 4 cards (WhatsApp, Messenger, Instagram, Web Chat) with "Conectar"/"Criar" buttons
2. **Connected channels table** — existing `ChannelsTable` showing connected channels with status badges
3. Integration with `useMetaOAuth` hook for Messenger/Instagram connection flow
4. Keep existing QR dialog for WhatsApp Baileys
5. Keep existing form sheet for Web Chat (widgetColor, welcomeMessage, etc.)

The implementing agent should read `docs/UI-PATTERNS.md` and `docs/FRONTEND-PATTERNS.md` and use the `frontend-design` skill for the visual implementation.

- [ ] **Step 5: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/channels/components/
git commit -m "feat: rewrite channels page — OAuth cards, asset selection, status badges"
```

---

### Task 13: OAuth callback page

**Files:**

- Create: `apps/web/src/app/(app)/settings/channels/callback/page.tsx`

- [ ] **Step 1: Create callback page**

This page handles the Meta OAuth redirect. The URL will be something like:
`/settings/channels/callback?code=XXX&state=YYY`

The page should:

1. Extract `code` and `state` from URL query params
2. Post a message to the opener window (parent) using `window.opener.postMessage()`
3. Close itself

```typescript
'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function MetaOAuthCallbackPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (window.opener) {
      window.opener.postMessage(
        { type: 'meta-oauth-callback', code, state, error },
        window.location.origin
      )
      window.close()
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Processando autorização...</p>
    </div>
  )
}
```

Note: The `META_OAUTH_REDIRECT_URI` should point to the **backend** callback endpoint (chat-server), NOT this frontend page. The backend processes the code and then the frontend is notified via the popup message flow. Alternatively, the redirect can go to this frontend page which then calls the backend. The implementing agent should decide the best approach based on how the popup flow works.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(app\)/settings/channels/callback/
git commit -m "feat: add Meta OAuth callback page for popup redirect handling"
```

---

## Phase 2 — WhatsApp Embedded Signup

> **Prerequisite:** Bens Seguros must be registered as a Meta Tech Provider before implementing this phase. Initiate the registration process during Phase 1B implementation.

### Task 14: WhatsApp env vars + service

**Files:**

- Modify: `packages/env/src/index.ts`
- Create: `apps/chat-server/src/infra/http/routes/meta-whatsapp-service.ts`

- [ ] **Step 1: Add WhatsApp env vars**

In `packages/env/src/index.ts`, add to `server`:

```typescript
    META_WA_CONFIG_ID: z.string().optional(),
```

Add to `client`:

```typescript
    NEXT_PUBLIC_META_WA_CONFIG_ID: z.string().optional(),
```

- [ ] **Step 2: Create WhatsApp service**

Create `apps/chat-server/src/infra/http/routes/meta-whatsapp-service.ts`:

```typescript
import { env } from '@repo/env'
import { Channel } from '@repo/db-chat'
import { encryptToken } from '@repo/shared/meta-crypto'

const META_GRAPH_API = 'https://graph.facebook.com/v21.0'

interface EmbeddedSignupInput {
  tenantId: string
  code: string
  phoneNumberId: string
  wabaId: string
  name: string
}

interface ConnectResult {
  channelId: string
  name: string
  type: string
  status: string
  phoneNumber: string | null
}

export async function connectWhatsAppEmbeddedSignup(
  input: EmbeddedSignupInput
): Promise<ConnectResult> {
  const appId = env.META_APP_ID
  const appSecret = env.META_APP_SECRET
  if (!appId || !appSecret) {
    throw new Error('META_APP_ID and META_APP_SECRET required')
  }

  // Exchange code for Business Integration System User token (non-expiring)
  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code: input.code,
  })

  const tokenResponse = await fetch(
    `${META_GRAPH_API}/oauth/access_token?${tokenParams.toString()}`
  )
  const tokenData = (await tokenResponse.json()) as Record<string, unknown>

  if (!tokenResponse.ok || typeof tokenData['error'] === 'object') {
    const err = tokenData['error'] as Record<string, unknown> | undefined
    throw new Error(
      `WhatsApp token exchange failed: ${err?.['message'] ?? 'Unknown error'}`
    )
  }

  const accessToken = tokenData['access_token'] as string

  // Register phone number
  const registerResponse = await fetch(
    `${META_GRAPH_API}/${input.phoneNumberId}/register`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: '000000',
      }),
    }
  )

  if (!registerResponse.ok) {
    const registerData = (await registerResponse.json()) as Record<
      string,
      unknown
    >
    const err = registerData['error'] as Record<string, unknown> | undefined
    throw new Error(
      `Phone registration failed: ${err?.['message'] ?? 'Unknown error'}`
    )
  }

  // Subscribe WABA to webhooks
  await fetch(`${META_GRAPH_API}/${input.wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  // Fetch phone number details
  const phoneResponse = await fetch(
    `${META_GRAPH_API}/${input.phoneNumberId}?fields=display_phone_number&access_token=${accessToken}`
  )
  const phoneData = (await phoneResponse.json()) as Record<string, unknown>
  const phoneNumber = (phoneData['display_phone_number'] as string) ?? null

  // Encrypt token and create channel
  const encryptedToken = encryptToken(accessToken)

  const channel = await Channel.create({
    tenantId: input.tenantId,
    name: input.name,
    type: 'WHATSAPP',
    brokerType: 'META',
    phoneNumber,
    isActive: true,
    status: 'CONNECTED',
    lastConnectedAt: new Date(),
    connectionMethod: 'embedded_signup',
    tokenExpiresAt: null, // BISU tokens don't expire
    scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'],
    config: {
      metaPhoneNumberId: input.phoneNumberId,
      metaWabaId: input.wabaId,
      metaToken: encryptedToken,
    },
  })

  return {
    channelId: String(channel._id),
    name: channel.name,
    type: channel.type as string,
    status: channel.status as string,
    phoneNumber,
  }
}
```

- [ ] **Step 3: Add route to meta-routes.ts**

In `apps/chat-server/src/infra/http/routes/meta-routes.ts`, add import:

```typescript
import { connectWhatsAppEmbeddedSignup } from './meta-whatsapp-service.js'
```

Add route inside the `metaRoutes` function:

```typescript
// POST /meta/whatsapp/connect — Connect WhatsApp via Embedded Signup
app.post(
  '/meta/whatsapp/connect',
  async (
    request: FastifyRequest<{
      Body: {
        code: string
        phoneNumberId: string
        wabaId: string
        name: string
      }
    }>,
    reply: FastifyReply
  ) => {
    const body = request.body as Record<string, unknown>
    const code = body['code']
    const phoneNumberId = body['phoneNumberId']
    const wabaId = body['wabaId']
    const name = body['name']

    if (
      typeof code !== 'string' ||
      typeof phoneNumberId !== 'string' ||
      typeof wabaId !== 'string' ||
      typeof name !== 'string'
    ) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'code, phoneNumberId, wabaId, name are required',
        },
      })
    }

    const tenantId = request.organizationId

    try {
      const result = await connectWhatsAppEmbeddedSignup({
        tenantId,
        code,
        phoneNumberId,
        wabaId,
        name,
      })

      app.log.info(
        {
          event: 'meta.channel.connected',
          tenantId,
          channelId: result.channelId,
          channelType: 'WHATSAPP',
          connectionMethod: 'embedded_signup',
        },
        'WhatsApp channel connected via Embedded Signup'
      )

      return reply
        .status(201)
        .send({ success: true, data: { channel: result } })
    } catch (err) {
      app.log.error({ err }, 'WhatsApp Embedded Signup connection failed')
      return reply.status(422).send({
        success: false,
        error: {
          code: 'WHATSAPP_CONNECT_FAILED',
          message:
            err instanceof Error ? err.message : 'Failed to connect WhatsApp',
        },
      })
    }
  }
)
```

- [ ] **Step 4: Commit**

```bash
git add packages/env/src/index.ts apps/chat-server/src/infra/http/routes/meta-whatsapp-service.ts apps/chat-server/src/infra/http/routes/meta-routes.ts
git commit -m "feat: add WhatsApp Embedded Signup service + /meta/whatsapp/connect endpoint"
```

---

### Task 15: Frontend — WhatsApp method dialog + Embedded Signup

**Files:**

- Create: `apps/web/src/features/channels/components/whatsapp-method-dialog.tsx`
- Create: `apps/web/src/features/channels/components/meta-embedded-signup.tsx`

- [ ] **Step 1: Create WhatsApp method dialog**

`whatsapp-method-dialog.tsx` should:

- Show two options: "WhatsApp Business (Cloud API)" and "WhatsApp Pessoal (QR Code)"
- Cloud API option triggers the Embedded Signup flow
- QR Code option opens the existing Baileys QR dialog
- Use shadcn Dialog or Sheet component

- [ ] **Step 2: Create Embedded Signup component**

`meta-embedded-signup.tsx` should:

- Load the Facebook JS SDK (`https://connect.facebook.net/en_US/sdk.js`) via script tag
- Call `FB.init({ appId: NEXT_PUBLIC_META_APP_ID, ... })`
- Call `FB.login()` with Embedded Signup config:
  ```javascript
  FB.login(callback, {
    config_id: NEXT_PUBLIC_META_WA_CONFIG_ID,
    response_type: 'code',
    override_default_response_type: true,
    extras: {
      setup: {},
      featureType: 'whatsapp_embedded_signup',
      sessionInfoVersion: '3',
    },
  })
  ```
- Handle the callback: extract `code` from `authResponse`, `phone_number_id` and `waba_id` from session info event
- Call `POST /meta/whatsapp/connect` with the extracted data
- Show loading/success/error states

- [ ] **Step 3: Integrate into channels-page.tsx**

Update the WhatsApp card in channels page to show the method dialog when clicked.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/channels/components/whatsapp-method-dialog.tsx apps/web/src/features/channels/components/meta-embedded-signup.tsx apps/web/src/features/channels/components/channels-page.tsx
git commit -m "feat: add WhatsApp method dialog + Embedded Signup component"
```

---

### Task 16: Cleanup — remove old manual Meta fields

**Files:**

- Modify: `apps/web/src/features/channels/components/channel-form-fields.tsx`
- Modify: `apps/web/src/features/channels/components/channel-meta-fields.tsx`
- Modify: `apps/web/src/features/channels/lib/schemas.ts`
- Modify: `apps/chat-server/src/infra/http/routes/channel-routes.ts`

- [ ] **Step 1: Remove manual Meta credential fields from frontend**

In `channel-form-fields.tsx`: remove `MetaSocialFields` component that shows App ID, App Secret, Page ID, Token inputs.

In `channel-meta-fields.tsx`: remove `ChannelMetaFields` component for WhatsApp Meta manual fields.

In `schemas.ts`: remove `metaToken`, `metaAppId`, `metaAppSecret`, `metaPageId` from `channelFormSchema`. Keep WebChat fields (`widgetColor`, `welcomeMessage`, etc.).

- [ ] **Step 2: Remove manual Meta validation from channel routes**

In `channel-routes.ts`: remove the `validateMetaCredentials` call in POST/PUT handlers for Meta channels. These channels are now created via `/meta/connect` and `/meta/whatsapp/connect`.

Keep the channel CRUD routes for WebChat and for reading/listing/deactivating all channel types.

- [ ] **Step 3: Run typecheck + lint + build**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/channels/ apps/chat-server/src/infra/http/routes/channel-routes.ts
git commit -m "refactor: remove manual Meta credential fields — channels now created via OAuth/Embedded Signup"
```

---

## Quality Gates

After all tasks are complete, run the full quality gate:

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

All 4 must pass before the branch is ready for review.
