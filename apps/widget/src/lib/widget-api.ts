import { z } from 'zod'

import { CHAT_SERVER_URL } from './constants'

const channelConfigSchema = z.object({
  channelId: z.string(),
  name: z.string(),
  widgetColor: z.string(),
  welcomeMessage: z.string(),
})

export type ChannelConfig = z.infer<typeof channelConfigSchema>

const conversationResponseSchema = z.object({
  conversationId: z.string(),
  visitorToken: z.string(),
})

export type ConversationResponse = z.infer<typeof conversationResponseSchema>

const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderType: z.enum(['CLIENT', 'AGENT', 'BOT', 'SYSTEM']),
  senderName: z.string().nullable(),
  text: z.string().nullable(),
  type: z.string(),
  status: z.string(),
  createdAt: z.string(),
})

export type WidgetMessage = z.infer<typeof messageSchema>

const messagesResponseSchema = z.object({
  data: z.array(messageSchema),
  meta: z.object({ hasMore: z.boolean() }),
})

const sendMessageResponseSchema = z.object({
  id: z.string(),
})

interface ApiResult {
  readonly success: boolean
  readonly data?: unknown
  readonly meta?: unknown
  readonly error?: { code: string; message: string }
}

function isApiResponseShape(value: unknown): value is ApiResult {
  if (typeof value !== 'object' || value === null) return false
  return 'success' in value
}

async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult> {
  const url = `${CHAT_SERVER_URL}/widget${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const json: unknown = await response.json()
  if (isApiResponseShape(json)) {
    return json
  }
  return {
    success: false,
    error: { code: 'UNKNOWN', message: 'Resposta inesperada do servidor' },
  }
}

function authHeaders(visitorToken: string): Record<string, string> {
  return { Authorization: `Bearer ${visitorToken}` }
}

export async function fetchChannelConfig(
  channelId: string
): Promise<ChannelConfig | null> {
  const result = await apiFetch(`/config/${channelId}`)
  if (!result.success || !result.data) {
    return null
  }
  const parsed = channelConfigSchema.safeParse(result.data)
  return parsed.success ? parsed.data : null
}

export async function startConversation(params: {
  channelId: string
  name: string
  phone: string
  email?: string
}): Promise<ConversationResponse | null> {
  const result = await apiFetch('/conversations', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  if (!result.success || !result.data) {
    return null
  }
  const parsed = conversationResponseSchema.safeParse(result.data)
  return parsed.success ? parsed.data : null
}

export async function fetchMessages(
  conversationId: string,
  visitorToken: string,
  before?: string
): Promise<{ messages: WidgetMessage[]; hasMore: boolean } | null> {
  const query = before ? `?before=${encodeURIComponent(before)}` : ''
  const result = await apiFetch(`/conversations/${conversationId}${query}`, {
    headers: authHeaders(visitorToken),
  })
  if (!result.success || !result.data) {
    return null
  }
  const parsed = messagesResponseSchema.safeParse({
    data: result.data,
    meta: result.meta,
  })
  if (!parsed.success) {
    return null
  }
  return { messages: parsed.data.data, hasMore: parsed.data.meta.hasMore }
}

export async function sendMessageRest(
  conversationId: string,
  visitorToken: string,
  text: string
): Promise<{ id: string } | null> {
  const result = await apiFetch(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
    headers: authHeaders(visitorToken),
  })
  if (!result.success || !result.data) {
    return null
  }
  const parsed = sendMessageResponseSchema.safeParse(result.data)
  return parsed.success ? parsed.data : null
}
