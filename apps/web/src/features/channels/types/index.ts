import type { BrokerType, ChannelType } from '@repo/shared'

export type { ChannelData, ChannelStatus } from '@/features/chat/types'
export type { ChannelType }

export interface CreateChannelPayload {
  readonly name: string
  readonly type: ChannelType
  readonly brokerType: BrokerType
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
