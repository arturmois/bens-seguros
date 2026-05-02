export const CHANNEL_TYPES = [
  'WHATSAPP',
  'WEB_CHAT',
  'MESSENGER',
  'INSTAGRAM',
] as const
export type ChannelType = (typeof CHANNEL_TYPES)[number]

export const BROKER_TYPES = [
  'BAILEYS',
  'META',
  'WEB_CHAT',
  'MESSENGER',
  'INSTAGRAM',
] as const
export type BrokerType = (typeof BROKER_TYPES)[number]

export const CHANNEL_META: Record<
  ChannelType,
  { label: string; color: string }
> = {
  WHATSAPP: { label: 'WhatsApp', color: '#25D366' },
  WEB_CHAT: { label: 'Web Chat', color: '#1f4b5f' },
  MESSENGER: { label: 'Messenger', color: '#0084FF' },
  INSTAGRAM: { label: 'Instagram', color: '#E4405F' },
}
