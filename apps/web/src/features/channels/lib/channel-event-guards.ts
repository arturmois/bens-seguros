import { isRecord } from '@/features/chat/lib/type-guards'

import type { ChannelStatusEvent, PairingCodeResultEvent } from '../types'

export function isChannelStatusEvent(
  data: unknown
): data is ChannelStatusEvent {
  if (!isRecord(data)) return false
  return (
    typeof data['channelId'] === 'string' &&
    typeof data['status'] === 'string' &&
    ['CONNECTED', 'DISCONNECTED', 'QR_PENDING'].includes(data['status'])
  )
}

export function isPairingCodeResultEvent(
  data: unknown
): data is PairingCodeResultEvent {
  if (!isRecord(data)) return false
  return (
    typeof data['channelId'] === 'string' &&
    typeof data['success'] === 'boolean'
  )
}

interface ChannelStateAckData {
  readonly state: string
  readonly qr: string | null
}

export interface ChannelStateAck {
  readonly ok: boolean
  readonly data?: ChannelStateAckData
}

export function isChannelStateAck(data: unknown): data is ChannelStateAck {
  if (!isRecord(data)) return false
  if (typeof data['ok'] !== 'boolean') return false
  if (data['ok'] && isRecord(data['data'])) {
    const inner = data['data']
    return typeof inner['state'] === 'string'
  }
  return true
}
