export type { ChannelData, ChannelStatus } from '@/features/chat/types'

export interface CreateChannelPayload {
  readonly name: string
  readonly type: 'WHATSAPP'
  readonly brokerType: 'BAILEYS' | 'META'
  readonly phoneNumber?: string
  readonly metaToken?: string
  readonly phoneNumberId?: string
}

export interface UpdateChannelPayload {
  readonly name?: string
  readonly phoneNumber?: string
  readonly isActive?: boolean
  readonly aiAgentId?: string | null
}

export interface ChannelStatusEvent {
  readonly channelId: string
  readonly status: 'CONNECTED' | 'DISCONNECTED' | 'QR_PENDING'
  readonly qr?: string
}

export interface PairingCodeResultEvent {
  readonly channelId: string
  readonly tenantId: string
  readonly success: boolean
  readonly code?: string
  readonly error?: string
}
