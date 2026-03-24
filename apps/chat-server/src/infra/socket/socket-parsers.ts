/** Type-safe parsers for Socket.IO event payloads */
import { isRecord } from '@repo/shared'

export function parseConversationId(data: unknown): string | null {
  if (!isRecord(data)) return null
  if (typeof data['conversationId'] !== 'string') return null
  return data['conversationId']
}

interface TransferData {
  readonly conversationId: string
  readonly targetAgentId: string
  readonly targetAgentName: string
}

export function parseTransferData(data: unknown): TransferData | null {
  if (!isRecord(data)) return null
  if (typeof data['conversationId'] !== 'string') return null
  if (typeof data['targetAgentId'] !== 'string') return null
  if (typeof data['targetAgentName'] !== 'string') return null
  return {
    conversationId: data['conversationId'],
    targetAgentId: data['targetAgentId'],
    targetAgentName: data['targetAgentName'],
  }
}

interface SendMessageData {
  readonly conversationId: string
  readonly text: string
}

const MAX_MESSAGE_TEXT_LENGTH = 4096

export function parseSendMessageData(data: unknown): SendMessageData | null {
  if (!isRecord(data)) return null
  if (typeof data['conversationId'] !== 'string') return null
  if (typeof data['text'] !== 'string') return null
  const text = data['text']
  if (text.length === 0 || text.length > MAX_MESSAGE_TEXT_LENGTH) return null
  return { conversationId: data['conversationId'], text }
}

interface CatchUpData {
  readonly conversationIds: string[]
  readonly after: Date
}

export function parseCatchUpData(data: unknown): CatchUpData | null {
  if (!isRecord(data)) return null
  if (!Array.isArray(data['conversationIds'])) return null
  const timestamp = data['lastEventTimestamp']
  if (typeof timestamp !== 'string' && typeof timestamp !== 'number')
    return null
  const ids = (data['conversationIds'] as unknown[]).filter(
    (id): id is string => typeof id === 'string'
  )
  if (ids.length === 0 || ids.length > 100) return null
  return { conversationIds: ids, after: new Date(timestamp) }
}

export function parseChannelId(data: unknown): string | null {
  if (!isRecord(data)) return null
  if (typeof data['channelId'] !== 'string') return null
  return data['channelId']
}

export function formatError(err: unknown): { code: string; message: string } {
  if (err instanceof Error && 'code' in err && typeof err.code === 'string') {
    return { code: err.code, message: err.message }
  }
  return { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' }
}
