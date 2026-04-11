import type { SortingState, VisibilityState } from '@tanstack/react-table'

import type { ChannelBrokerType, ChannelStatusFilter } from './types'

interface SelectOption<TValue extends string> {
  readonly value: TValue
  readonly label: string
}

export const BROKER_TYPE_LABELS: Record<ChannelBrokerType, string> = {
  BAILEYS: 'Baileys',
  META: 'Meta',
  WEB_CHAT: 'Web Chat',
  MESSENGER: 'Messenger',
  INSTAGRAM: 'Instagram',
}

export const STATUS_FILTER_OPTIONS: readonly SelectOption<ChannelStatusFilter>[] =
  [
    { value: 'ALL', label: 'Todos' },
    { value: 'CONNECTED', label: 'Conectados' },
    { value: 'DISCONNECTED', label: 'Offline' },
    { value: 'QR_PENDING', label: 'QR' },
  ] as const

export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  phoneNumber: true,
  brokerType: true,
}

export const HIDEABLE_COLUMNS = [
  { id: 'phoneNumber', label: 'Número' },
  { id: 'brokerType', label: 'Conexão' },
] as const

export const DEFAULT_SORTING: SortingState = [{ id: 'name', desc: false }]
