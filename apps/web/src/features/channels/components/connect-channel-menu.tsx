'use client'

import { Globe, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { ChannelIcon } from '@/features/chat/components/channel-icon'

interface ConnectChannelMenuProps {
  readonly onWhatsAppClick: () => void
  readonly onWebChatClick: () => void
}

export function ConnectChannelMenu({
  onWhatsAppClick,
  onWebChatClick,
}: ConnectChannelMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button />}>
        <Plus className="size-4" />
        Conectar canal
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onWhatsAppClick}>
          <ChannelIcon channelType="WHATSAPP" size={16} />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onWebChatClick}>
          <Globe className="size-4" />
          Web Chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
