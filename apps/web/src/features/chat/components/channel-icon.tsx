import { CHANNEL_META } from '@repo/shared'
import { Globe } from 'lucide-react'

import type { ChannelType } from '../types'

interface ChannelIconProps {
  readonly channelType: ChannelType
  readonly size?: number
}

function WhatsAppSvg({ size }: { readonly size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
        fill={CHANNEL_META.WHATSAPP.color}
      />
      <path
        d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14l-.29-.174-3.01.79.8-2.93-.19-.3A7.96 7.96 0 014 12c0-4.42 3.58-8 8-8s8 3.58 8 8-3.58 8-8 8z"
        fill={CHANNEL_META.WHATSAPP.color}
      />
    </svg>
  )
}

function MessengerSvg({ size }: { readonly size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.15.16.14.26.34.27.55l.05 1.74c.02.58.62.96 1.15.73l1.94-.86c.16-.07.34-.09.51-.05.93.26 1.92.4 2.93.4 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2z"
        fill={CHANNEL_META.MESSENGER.color}
      />
      <path
        d="M7.07 14.23l2.38-3.78c.38-.6 1.17-.76 1.75-.35l1.89 1.42c.17.13.4.13.57 0l2.55-1.94c.34-.26.78.13.55.5l-2.38 3.78c-.38.6-1.17.76-1.75.35l-1.89-1.42a.46.46 0 00-.57 0l-2.55 1.94c-.34.26-.78-.13-.55-.5z"
        fill="white"
      />
    </svg>
  )
}

function InstagramSvg({ size }: { readonly size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#F77737" />
          <stop offset="50%" stopColor="#E4405F" />
          <stop offset="75%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad)" />
      <circle
        cx="12"
        cy="12"
        r="4.5"
        stroke="white"
        strokeWidth="1.8"
        fill="none"
      />
      <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
    </svg>
  )
}

const ICON_MAP: Record<
  ChannelType,
  (props: { size: number }) => React.ReactElement
> = {
  WHATSAPP: WhatsAppSvg,
  WEB_CHAT: ({ size }) => (
    <Globe size={size} color={CHANNEL_META.WEB_CHAT.color} />
  ),
  MESSENGER: MessengerSvg,
  INSTAGRAM: InstagramSvg,
}

export function ChannelIcon({ channelType, size = 16 }: ChannelIconProps) {
  const IconComponent = ICON_MAP[channelType]
  return <IconComponent size={size} />
}
