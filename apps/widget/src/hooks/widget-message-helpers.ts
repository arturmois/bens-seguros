import type { WidgetMessage } from '../lib/widget-api'

// ---------------------------------------------------------------------------
// Sender type helpers
// ---------------------------------------------------------------------------

function isSenderType(value: string): value is WidgetMessage['senderType'] {
  return (
    value === 'CLIENT' ||
    value === 'AGENT' ||
    value === 'BOT' ||
    value === 'SYSTEM'
  )
}

export function parseSenderType(value: unknown): WidgetMessage['senderType'] {
  if (typeof value === 'string' && isSenderType(value)) {
    return value
  }
  return 'SYSTEM'
}

// ---------------------------------------------------------------------------
// Typing state
// ---------------------------------------------------------------------------

export interface TypingState {
  readonly isTyping: boolean
  readonly name: string | null
}

// ---------------------------------------------------------------------------
// Hook result
// ---------------------------------------------------------------------------

export interface UseWidgetSocketResult {
  readonly messages: WidgetMessage[]
  readonly isConnected: boolean
  readonly typing: TypingState
  readonly hasMore: boolean
  readonly isLoadingMessages: boolean
  readonly sendMessage: (text: string) => void
  readonly emitTyping: () => void
  readonly loadMoreMessages: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Parse incoming socket message data into WidgetMessage
// ---------------------------------------------------------------------------

export function parseIncomingMessage(
  data: Record<string, unknown>
): WidgetMessage {
  return {
    id: String(data['id'] ?? ''),
    conversationId: String(data['conversationId'] ?? ''),
    senderType: parseSenderType(data['senderType']),
    senderName:
      typeof data['senderName'] === 'string' ? data['senderName'] : null,
    text: typeof data['text'] === 'string' ? data['text'] : null,
    type: typeof data['type'] === 'string' ? data['type'] : 'TEXT',
    status: typeof data['status'] === 'string' ? data['status'] : 'DELIVERED',
    createdAt:
      typeof data['createdAt'] === 'string'
        ? data['createdAt']
        : new Date().toISOString(),
  }
}
