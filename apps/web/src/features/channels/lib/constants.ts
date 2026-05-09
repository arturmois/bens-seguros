import type { SortingState, VisibilityState } from '@tanstack/react-table'

import type { ChannelBrokerType } from './types'

export const BROKER_TYPE_LABELS: Record<ChannelBrokerType, string> = {
  BAILEYS: 'Baileys',
  META: 'Meta',
  WEB_CHAT: 'Web Chat',
  MESSENGER: 'Messenger',
  INSTAGRAM: 'Instagram',
}

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  phoneNumber: true,
  brokerType: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'phoneNumber', label: 'Número' },
  { id: 'brokerType', label: 'Conexão' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }]
