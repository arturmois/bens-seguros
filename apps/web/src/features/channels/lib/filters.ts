import { Wifi } from 'lucide-react'

import type { FilterDefinition } from '@/components/shared/filter-types'

import type { ChannelData } from '../types'

const STATUS_OPTIONS = [
  { value: 'CONNECTED', label: 'Conectado' },
  { value: 'DISCONNECTED', label: 'Offline' },
  { value: 'QR_PENDING', label: 'QR Pendente' },
] as const

export const CHANNEL_FILTERS: readonly FilterDefinition[] = [
  {
    key: 'statusIn',
    label: 'Status',
    icon: Wifi,
    type: 'enum',
    options: STATUS_OPTIONS,
  },
] as const

export function matchesStatus(
  channel: ChannelData,
  statusIn: readonly string[] | undefined
): boolean {
  if (!statusIn || statusIn.length === 0) return true
  return statusIn.includes(channel.status)
}

export function matchesSearch(channel: ChannelData, search: string): boolean {
  if (!search) return true
  const needle = search.toLowerCase()
  return (
    channel.name.toLowerCase().includes(needle) ||
    (channel.phoneNumber ?? '').toLowerCase().includes(needle)
  )
}
