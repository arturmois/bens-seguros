import { CHAT_CLIENT_COMMANDS } from './chat-constants'

export type ClientCommand = 'CLOSE'

export function detectClientCommand(
  text: string | null | undefined,
  type: string
): ClientCommand | null {
  if (type !== 'TEXT') return null
  if (typeof text !== 'string') return null
  const normalized = text.trim().toLowerCase()
  if (normalized === CHAT_CLIENT_COMMANDS.CLOSE) return 'CLOSE'
  return null
}
