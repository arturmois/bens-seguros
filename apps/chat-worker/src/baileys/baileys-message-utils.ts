import type { AnyMessageContent, ConnectionState, WAMessage } from 'baileys'
import { DisconnectReason } from 'baileys'

import type {
  IncomingMessage,
  MessagePayload,
  StatusUpdate,
} from '../messaging/broker.js'

export const WHATSAPP_JID_SUFFIX = '@s.whatsapp.net'
export const WHATSAPP_LID_SUFFIX = '@lid'

type MessageContentType =
  | 'TEXT'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'OTHER'

export function phoneToJid(phone: string): string {
  return `${phone.replace(/\D/g, '')}${WHATSAPP_JID_SUFFIX}`
}

export function extractMessageType(msg: WAMessage): MessageContentType {
  const content = msg.message
  if (!content) {
    return 'OTHER'
  }

  if (content.conversation || content.extendedTextMessage) {
    return 'TEXT'
  }

  if (content.imageMessage) {
    return 'IMAGE'
  }

  if (content.audioMessage) {
    return 'AUDIO'
  }

  if (content.videoMessage) {
    return 'VIDEO'
  }

  if (content.documentMessage) {
    return 'DOCUMENT'
  }

  return 'OTHER'
}

export function extractMessageText(msg: WAMessage): string | undefined {
  const content = msg.message
  if (!content) {
    return undefined
  }

  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    content.documentMessage?.caption ??
    undefined
  )
}

/** Returns true if the JID is a personal chat (not group, broadcast, etc.) */
export function isPersonalJid(jid: string | null | undefined): boolean {
  if (!jid) return false
  return jid.endsWith(WHATSAPP_JID_SUFFIX) || jid.endsWith(WHATSAPP_LID_SUFFIX)
}

/**
 * Extract the phone number from a WAMessage.
 * Prefers remoteJidAlt (@s.whatsapp.net) over remoteJid (@lid) when available,
 * since LID-based JIDs don't contain the real phone number.
 */
export function extractFrom(msg: WAMessage): string {
  const altJid = (msg.key as Record<string, unknown>)['remoteJidAlt']
  if (typeof altJid === 'string' && altJid.endsWith(WHATSAPP_JID_SUFFIX)) {
    return altJid.replace(WHATSAPP_JID_SUFFIX, '')
  }
  const jid = msg.key.remoteJid ?? ''
  return jid.replace(WHATSAPP_JID_SUFFIX, '').replace(WHATSAPP_LID_SUFFIX, '')
}

interface MappedConnectionState {
  status: 'CONNECTED' | 'DISCONNECTED' | 'QR_PENDING'
  qr?: string
}

export function mapConnectionState(
  update: Partial<ConnectionState>
): MappedConnectionState | null {
  if (update.qr) {
    return { status: 'QR_PENDING', qr: update.qr }
  }

  if (update.connection === 'open') {
    return { status: 'CONNECTED' }
  }

  if (update.connection === 'close') {
    return { status: 'DISCONNECTED' }
  }

  return null
}

interface BoomLikeError {
  output?: { statusCode?: number }
}

function isBoomLikeError(err: unknown): err is BoomLikeError {
  if (typeof err !== 'object' || err === null || !('output' in err)) {
    return false
  }

  return typeof err.output === 'object'
}

export function shouldReconnect(update: Partial<ConnectionState>): boolean {
  const err = update.lastDisconnect?.error
  if (!err || !isBoomLikeError(err)) {
    return true
  }

  return err.output?.statusCode !== DisconnectReason.loggedOut
}

export function buildMessageContent(
  payload: MessagePayload
): AnyMessageContent {
  switch (payload.type) {
    case 'TEXT':
      return { text: payload.text ?? '' }
    case 'IMAGE':
      return { image: { url: payload.mediaUrl ?? '' } }
    case 'AUDIO':
      return { audio: { url: payload.mediaUrl ?? '' } }
    case 'VIDEO':
      return { video: { url: payload.mediaUrl ?? '' } }
    case 'DOCUMENT':
      return {
        document: { url: payload.mediaUrl ?? '' },
        mimetype: 'application/octet-stream',
      }
  }
}

export function toIncomingMessage(msg: WAMessage): IncomingMessage {
  return {
    from: extractFrom(msg),
    pushName: msg.pushName ?? undefined,
    text: extractMessageText(msg),
    type: extractMessageType(msg),
    externalId: msg.key.id ?? '',
    timestamp: new Date(
      typeof msg.messageTimestamp === 'number'
        ? msg.messageTimestamp * 1000
        : Date.now()
    ),
  }
}

const WA_STATUS_MAP: Record<number, StatusUpdate['status']> = {
  2: 'SENT',
  3: 'DELIVERED',
  4: 'READ',
  5: 'FAILED',
}

export function mapWAStatusUpdate(update: {
  key: { id?: string | null }
  update: Partial<WAMessage>
}): StatusUpdate | null {
  const externalId = update.key.id
  if (!externalId) {
    return null
  }

  const rawStatus = update.update.status
  if (typeof rawStatus !== 'number') {
    return null
  }

  const mappedStatus = WA_STATUS_MAP[rawStatus]
  if (!mappedStatus) {
    return null
  }

  return { externalId, status: mappedStatus }
}
