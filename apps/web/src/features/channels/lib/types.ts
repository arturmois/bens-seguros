import type { ChannelData } from '../types'

export type ChannelBrokerType = ChannelData['brokerType']

/**
 * Subset of ChannelStatus the UI exposes as filter tabs. Kept explicit so the
 * type guard in `filters.ts` stays exhaustive — if a new tab is added here,
 * both the guard and `STATUS_FILTER_OPTIONS` must be extended to match.
 */
export type ChannelStatusFilter =
  | 'ALL'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'QR_PENDING'
