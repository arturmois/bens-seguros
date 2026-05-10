import { isRecord } from '@repo/shared'
import type { Socket } from 'socket.io'
import { z } from 'zod'

export const visitorTokenSchema = z.object({
  conversationId: z.string(),
  contactId: z.string(),
  channelId: z.string(),
  tenantId: z.string(),
})

export type VisitorTokenPayload = z.infer<typeof visitorTokenSchema>

export function getVisitorData(socket: Socket): VisitorTokenPayload {
  const visitor: unknown = socket.data['visitor']
  if (!isRecord(visitor)) {
    throw new Error('Socket visitor data not found')
  }
  return {
    conversationId: String(visitor['conversationId']),
    contactId: String(visitor['contactId']),
    channelId: String(visitor['channelId']),
    tenantId: String(visitor['tenantId']),
  }
}

const MIN_TEXT_LENGTH = 1
const MAX_TEXT_LENGTH = 4096

export interface WidgetSendMessageData {
  readonly text: string
}

export function parseWidgetSendMessage(
  data: unknown
): WidgetSendMessageData | null {
  if (!isRecord(data)) return null
  if (typeof data['text'] !== 'string') return null
  const text = data['text']
  if (text.length < MIN_TEXT_LENGTH || text.length > MAX_TEXT_LENGTH)
    return null
  return { text }
}
