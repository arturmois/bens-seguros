import type { ChannelData } from '../types'
import type { ChannelStatusFilter } from './types'

const CHANNEL_STATUS_FILTERS = [
  'ALL',
  'CONNECTED',
  'DISCONNECTED',
  'QR_PENDING',
] as const satisfies readonly ChannelStatusFilter[]

export function isChannelStatusFilter(
  value: string
): value is ChannelStatusFilter {
  return (CHANNEL_STATUS_FILTERS as readonly string[]).includes(value)
}

export function matchesStatus(
  channel: ChannelData,
  filter: ChannelStatusFilter
): boolean {
  if (filter === 'ALL') return true
  return channel.status === filter
}

export function matchesSearch(channel: ChannelData, search: string): boolean {
  if (!search) return true
  const needle = search.toLowerCase()
  return (
    channel.name.toLowerCase().includes(needle) ||
    (channel.phoneNumber ?? '').toLowerCase().includes(needle)
  )
}
