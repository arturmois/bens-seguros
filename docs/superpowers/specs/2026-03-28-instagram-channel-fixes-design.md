# Instagram/Messenger Channel Fixes — Design Spec

**Date:** 2026-03-28
**Context:** Production testing of Instagram DM channel revealed 5 bugs and UX gaps that prevent successful channel configuration by non-developer users.

---

## Problems Discovered in Production

| #   | Bug                                                                               | File                             | Impact                                                                                                    |
| --- | --------------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | `buildCreatePayload` sets `brokerType: 'META'` for INSTAGRAM/MESSENGER            | `channel-form-fields.tsx:269`    | Wrong broker selected on send → MetaBroker requires `metaPhoneNumberId` which doesn't exist for Instagram |
| 2   | Edit form doesn't send `config` fields (metaPageId/metaToken)                     | `channel-form-sheet.tsx:105-108` | Cannot update Page ID or Token after creation                                                             |
| 3   | Backend `updateChannelBodySchema` doesn't accept `config`                         | `channel-routes.ts:20-26`        | API rejects config in PUT even if frontend sends it                                                       |
| 4   | `form.reset` in edit mode doesn't populate metaPageId/metaToken from channel data | `channel-form-sheet.tsx:87-93`   | Fields appear empty when editing                                                                          |
| 5   | Tutorial doc has incorrect Page ID and token type guidance                        | `MULTI-CHANNEL-SETUP.md`         | Users configure wrong values                                                                              |

---

## Fix 1: Correct `brokerType` in `buildCreatePayload`

**File:** `apps/web/src/features/channels/components/channel-form-fields.tsx`

**Current (line 266-274):**

```typescript
return {
  ...base,
  type: values.channelType,
  brokerType: 'META', // BUG: should be channel type
  config: {
    metaPageId: values.metaPageId,
    metaToken: values.metaToken,
  },
}
```

**Fix:** Change `brokerType: 'META'` to `brokerType: values.channelType`. The `send-message-processor.ts` switch uses `brokerType` to select `InstagramBroker` vs `MessengerBroker` vs `MetaBroker`.

---

## Fix 2: Edit flow — backend + frontend

### 2a: Backend — accept `config` in update schema

**File:** `apps/chat-server/src/infra/http/routes/channel-routes.ts`

Add `config: z.record(z.unknown()).optional()` to `updateChannelBodySchema`. The existing PUT handler already does `{ $set: body }` which will merge config correctly.

### 2b: Frontend — send config fields on edit

**File:** `apps/web/src/features/channels/components/channel-form-sheet.tsx`

In `handleSubmit` edit branch, include config fields for MESSENGER/INSTAGRAM:

```typescript
updateChannel.mutate({
  id: channel.id,
  payload: {
    name: values.name,
    phoneNumber: values.phoneNumber,
    aiAgentId: values.aiAgentId,
    // Include config for Meta social channels
    ...(isMetaSocialChannel && {
      config: {
        metaPageId: values.metaPageId,
        metaToken: values.metaToken,
      },
    }),
  },
})
```

### 2c: Frontend — populate form with existing config on edit

In `form.reset` for edit mode, read from `channel.config`:

```typescript
form.reset({
  channelType: channel.type,
  name: channel.name,
  brokerType: toFormBrokerType(channel.brokerType),
  phoneNumber: channel.phoneNumber ?? '',
  aiAgentId: channel.aiAgentId ?? null,
  metaPageId: channel.config?.metaPageId ?? '',
  metaToken: channel.config?.metaToken ?? '',
})
```

---

## Fix 3: Meta Token Validation (New Feature)

### 3a: Backend validation endpoint

**New route:** `POST /chat/channels/validate-meta`

```typescript
// Request
{ pageId: string, token: string, channelType: 'INSTAGRAM' | 'MESSENGER' }

// Response (success)
{ success: true, data: { id: string, name?: string, username?: string } }

// Response (failure)
{ success: false, error: { code: 'INVALID_TOKEN' | 'INVALID_PAGE_ID', message: string } }
```

Implementation: calls `GET https://graph.facebook.com/v21.0/{pageId}?fields=id,name,username&access_token={token}`.

### 3b: Backend validation on create/update

When creating or updating a channel with type INSTAGRAM or MESSENGER, validate the token before saving. If validation fails, return 422 with clear error message.

### 3c: Frontend "Testar Conexao" button

Add a button next to the Token field in `MetaSocialFields`. On click, calls the validate endpoint and shows result:

- Success: green check + account name/username
- Failure: red error + message from Meta API

### 3d: Frontend validation on submit

Before submitting create/update, if the backend returns 422 from token validation, show the error inline near the Token field.

---

## Fix 4: Improved UX — Helper Texts

**File:** `apps/web/src/features/channels/components/channel-form-fields.tsx`

Differentiated helper text per channel type in `MetaSocialFields`:

**Instagram Page ID:**

> "ID da conta Instagram. Encontre em Meta for Developers > Graph API Explorer: GET /me?fields=id,username (formato: 17841xxxxx)"

**Messenger Page ID:**

> "ID da Pagina do Facebook. Encontre em Configuracoes da Pagina > Transparencia da Pagina"

**Token (both):**

> "Page Access Token. Gere em Meta for Developers > seu App > Messenger > Tokens de Acesso. Selecione a pagina e clique Gerar Token."

---

## Fix 5: Update Tutorial Doc

**File:** `docs/MULTI-CHANNEL-SETUP.md`

Changes to Section 3 (Instagram DM):

- Correct Page ID: Instagram Account ID (not App ID)
- Correct Token type: Page Access Token (not Instagram User Token)
- Add step to find Instagram Account ID via Graph API
- Add troubleshooting section with common errors we encountered:
  - `META_WHATSAPP_TOKEN not configured` → set App Secret env var
  - `HMAC signature verification failed` → wrong App Secret
  - `No active channel found` → Page ID mismatch
  - `Invalid OAuth access token` → wrong token type (need Page Access Token)

---

## Files to Modify

| File                                                                | Change                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `apps/web/src/features/channels/components/channel-form-fields.tsx` | Fix brokerType + improve helper texts + add validate button                      |
| `apps/web/src/features/channels/components/channel-form-sheet.tsx`  | Fix edit form reset + edit submit payload                                        |
| `apps/web/src/features/channels/hooks/use-channels.ts`              | Add `useValidateMetaChannel` hook                                                |
| `apps/chat-server/src/infra/http/routes/channel-routes.ts`          | Add config to update schema + validate-meta endpoint + validate on create/update |
| `docs/MULTI-CHANNEL-SETUP.md`                                       | Correct Page ID, token guidance, add troubleshooting                             |

## Files NOT Modified

- Broker implementations (instagram-broker.ts, messenger-broker.ts) — correct as-is
- Webhook routes — correct as-is
- send-message-processor.ts — correct as-is (will work once brokerType is fixed)
