import { env } from '@repo/env'
import { z } from 'zod'

export const META_GRAPH_API = 'https://graph.facebook.com/v21.0'

const metaErrorDetailSchema = z.object({
  message: z.string(),
  type: z.string().optional(),
  code: z.number().optional(),
})

const metaPageFieldsResponseSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  username: z.string().optional(),
  error: metaErrorDetailSchema.optional(),
})

const metaConversationsResponseSchema = z.object({
  data: z.array(z.unknown()).optional(),
  error: metaErrorDetailSchema.optional(),
})

const metaSubscriptionResponseSchema = z.object({
  success: z.boolean().optional(),
  error: metaErrorDetailSchema.optional(),
})

export type MetaChannelType = 'INSTAGRAM' | 'MESSENGER' | 'WHATSAPP_META'

export interface MetaValidationSuccess {
  readonly valid: true
  readonly name: string
  readonly username?: string
}

export interface MetaValidationFailure {
  readonly valid: false
  readonly error: string
}

export type MetaValidationResult = MetaValidationSuccess | MetaValidationFailure

export interface WebhookSetupResult {
  readonly appSubscription: string
  readonly pageSubscription: string
}

export async function validateMetaCredentials(
  pageId: string,
  token: string,
  channelType: MetaChannelType
): Promise<MetaValidationResult> {
  try {
    if (channelType === 'MESSENGER') {
      const url = `${META_GRAPH_API}/${pageId}/conversations?access_token=${token}&limit=1`
      const response = await fetch(url)
      const raw: unknown = await response.json()
      const parsed = metaConversationsResponseSchema.safeParse(raw)
      if (!response.ok || (parsed.success && parsed.data.error)) {
        const message = parsed.success
          ? (parsed.data.error?.message ?? 'Token ou Page ID inválido')
          : 'Token ou Page ID inválido'
        return { valid: false, error: message }
      }
      return { valid: true, name: `Page ${pageId}` }
    }
    const fields = 'id,name,username'
    const url = `${META_GRAPH_API}/${pageId}?fields=${fields}&access_token=${token}`
    const response = await fetch(url)
    const raw: unknown = await response.json()
    const parsed = metaPageFieldsResponseSchema.safeParse(raw)
    if (!response.ok || (parsed.success && parsed.data.error)) {
      const message = parsed.success
        ? (parsed.data.error?.message ?? 'Token ou Page ID inválido')
        : 'Token ou Page ID inválido'
      return { valid: false, error: message }
    }
    if (!parsed.success) {
      return { valid: false, error: 'Resposta inesperada da API do Meta' }
    }
    return {
      valid: true,
      name: parsed.data.name ?? String(parsed.data.id ?? pageId),
      username: parsed.data.username,
    }
  } catch {
    return { valid: false, error: 'Falha ao conectar com a API do Meta' }
  }
}

async function registerAppWebhookSubscription(
  metaAppId: string,
  metaAppSecret: string
): Promise<{ success: boolean; error?: string }> {
  const verifyToken = env.META_WEBHOOK_VERIFY_TOKEN
  if (!verifyToken) {
    return { success: false, error: 'META_WEBHOOK_VERIFY_TOKEN not configured' }
  }
  const callbackUrl =
    env.CHAT_WEBHOOK_PUBLIC_URL ?? `${env.CHAT_SERVER_URL}/chat/webhook/meta`
  try {
    const response = await fetch(
      `${META_GRAPH_API}/${metaAppId}/subscriptions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object: 'page',
          callback_url: callbackUrl,
          verify_token: verifyToken,
          fields: 'messages,messaging_postbacks',
          access_token: `${metaAppId}|${metaAppSecret}`,
        }),
      }
    )
    const raw: unknown = await response.json()
    const parsed = metaSubscriptionResponseSchema.safeParse(raw)
    if (!response.ok) {
      const message = parsed.success
        ? (parsed.data.error?.message ??
          'Failed to register app webhook subscription')
        : 'Failed to register app webhook subscription'
      return { success: false, error: message }
    }
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'Failed to connect to Meta API for webhook registration',
    }
  }
}

async function subscribePageToWebhooks(
  metaPageId: string,
  metaToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${META_GRAPH_API}/${metaPageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: 'messages,messaging_postbacks',
          access_token: metaToken,
        }),
      }
    )
    const raw: unknown = await response.json()
    const parsed = metaSubscriptionResponseSchema.safeParse(raw)
    if (!response.ok) {
      const message = parsed.success
        ? (parsed.data.error?.message ?? 'Failed to subscribe page to webhooks')
        : 'Failed to subscribe page to webhooks'
      return { success: false, error: message }
    }
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'Failed to connect to Meta API for page subscription',
    }
  }
}

export async function autoRegisterWebhook(
  channelType: string,
  config: Record<string, unknown>
): Promise<WebhookSetupResult> {
  const metaAppId =
    typeof config['metaAppId'] === 'string' ? config['metaAppId'] : undefined
  const metaAppSecret =
    typeof config['metaAppSecret'] === 'string'
      ? config['metaAppSecret']
      : undefined
  const metaPageId =
    typeof config['metaPageId'] === 'string' ? config['metaPageId'] : undefined
  const metaToken =
    typeof config['metaToken'] === 'string' ? config['metaToken'] : undefined
  if (!metaAppId || !metaAppSecret) {
    return {
      appSubscription: 'skipped: missing appId or appSecret',
      pageSubscription: 'skipped',
    }
  }
  const appResult = await registerAppWebhookSubscription(
    metaAppId,
    metaAppSecret
  )
  const appSubscription = appResult.success
    ? 'registered'
    : `failed: ${appResult.error}`
  let pageSubscription = 'skipped'
  if (channelType === 'MESSENGER' && metaPageId && metaToken) {
    const pageResult = await subscribePageToWebhooks(metaPageId, metaToken)
    pageSubscription = pageResult.success
      ? 'subscribed'
      : `failed: ${pageResult.error}`
  }
  return { appSubscription, pageSubscription }
}

export async function validateMetaAppCredentials(
  metaAppId: string,
  metaAppSecret: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const appUrl = `${META_GRAPH_API}/${metaAppId}`
    const response = await fetch(appUrl, {
      headers: {
        Authorization: `Bearer ${metaAppId}|${metaAppSecret}`,
      },
    })
    if (!response.ok) {
      return { valid: false, error: 'App ID ou App Secret inválido' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Falha ao validar credenciais do App' }
  }
}
