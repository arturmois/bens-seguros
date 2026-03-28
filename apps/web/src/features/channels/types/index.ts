export type {
  ChannelData,
  ChannelStatus,
  ChannelType,
} from '@/features/chat/types'

export interface CreateChannelPayload {
  readonly name: string
  readonly type: 'WHATSAPP' | 'WEB_CHAT' | 'MESSENGER' | 'INSTAGRAM'
  readonly brokerType: 'BAILEYS' | 'META' | 'WEB_CHAT'
  readonly phoneNumber?: string
  readonly metaToken?: string
  readonly phoneNumberId?: string
  readonly config?: Record<string, unknown>
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
