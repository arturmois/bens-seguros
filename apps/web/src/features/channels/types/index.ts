export type {
  ChannelData,
  ChannelStatus,
  ChannelType,
} from '@/features/chat/types'

export interface CreateChannelPayload {
  readonly name: string
  readonly type: 'WHATSAPP' | 'WEB_CHAT' | 'MESSENGER' | 'INSTAGRAM'
  readonly brokerType:
    | 'BAILEYS'
    | 'META'
    | 'WEB_CHAT'
    | 'MESSENGER'
    | 'INSTAGRAM'
  readonly phoneNumber?: string
  readonly config?: Record<string, unknown>
}

export interface UpdateChannelPayload {
  readonly name?: string
  readonly phoneNumber?: string
  readonly isActive?: boolean
  readonly aiAgentId?: string | null
  readonly config?: Record<string, unknown>
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

export type ConnectionMethod =
  | 'oauth'
  | 'embedded_signup'
  | 'qr_code'
  | 'manual'

export interface MetaAsset {
  pageId: string
  pageName: string
  hasInstagram: boolean
  instagramAccountId: string | null
  instagramUsername?: string | null
}
