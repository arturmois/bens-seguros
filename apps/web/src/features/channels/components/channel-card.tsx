'use client'

import { Code, MoreHorizontal, Pencil, Power, QrCode } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'

import { ChannelIcon } from '@/features/chat/components/channel-icon'
import { BROKER_TYPE_LABELS } from '../lib/constants'
import type { ChannelData } from '../types'
import { ChannelStatusBadge } from './channel-status-badge'

interface ChannelCardProps {
  readonly channel: ChannelData
  readonly onEdit: (channel: ChannelData) => void
  readonly onQrCode: (channel: ChannelData) => void
  readonly onEmbed: (channel: ChannelData) => void
  readonly onDeactivate: (channel: ChannelData) => void
}

export function ChannelCard({
  channel,
  onEdit,
  onQrCode,
  onEmbed,
  onDeactivate,
}: ChannelCardProps) {
  return (
    <div
      className="bg-card active:bg-muted/50 cursor-pointer space-y-3 rounded-lg border p-4"
      onClick={() => onEdit(channel)}
      role="button"
      tabIndex={0}
      aria-label={`Editar canal ${channel.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(channel)
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ChannelIcon channelType={channel.type} size={20} />
          <div className="min-w-0">
            <div className="truncate font-medium">{channel.name}</div>
            <div className="text-muted-foreground text-xs">
              {channel.phoneNumber ?? 'Sem número'}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={`Ações do canal ${channel.name}`}
              />
            }
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(channel)}>
              <Pencil className="mr-2 size-4" />
              Editar
            </DropdownMenuItem>
            {channel.brokerType === 'BAILEYS' && (
              <DropdownMenuItem onClick={() => onQrCode(channel)}>
                <QrCode className="mr-2 size-4" />
                QR Code
              </DropdownMenuItem>
            )}
            {channel.type === 'WEB_CHAT' && (
              <DropdownMenuItem onClick={() => onEmbed(channel)}>
                <Code className="mr-2 size-4" />
                Código Embed
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeactivate(channel)}
            >
              <Power className="mr-2 size-4" />
              Desativar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Conexão</div>
          <div>
            {BROKER_TYPE_LABELS[channel.brokerType] ?? channel.brokerType}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Status</div>
          <ChannelStatusBadge status={channel.status} />
        </div>
      </div>
    </div>
  )
}
