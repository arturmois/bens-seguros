'use client'

import { Code, MoreHorizontal, Pencil, Power, QrCode } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { ChannelIcon } from '@/features/chat/components/channel-icon'
import type { ChannelData } from '../types'
import { ChannelStatusBadge } from './channel-status-badge'

interface ChannelsTableProps {
  readonly channels: readonly ChannelData[]
  readonly onEdit: (channel: ChannelData) => void
  readonly onQrCode: (channel: ChannelData) => void
  readonly onDeactivate: (channel: ChannelData) => void
  readonly onEmbed?: (channel: ChannelData) => void
}

const BROKER_TYPE_LABELS: Record<string, string> = {
  BAILEYS: 'Baileys',
  META: 'Meta',
  WEB_CHAT: 'Web Chat',
}

export function ChannelsTable({
  channels,
  onEdit,
  onQrCode,
  onDeactivate,
  onEmbed,
}: ChannelsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Canal</TableHead>
          <TableHead>Número</TableHead>
          <TableHead>Conexão</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {channels.map((channel) => (
          <ChannelRow
            key={channel.id}
            channel={channel}
            onEdit={onEdit}
            onQrCode={onQrCode}
            onDeactivate={onDeactivate}
            onEmbed={onEmbed}
          />
        ))}
      </TableBody>
    </Table>
  )
}

interface ChannelRowProps {
  readonly channel: ChannelData
  readonly onEdit: (channel: ChannelData) => void
  readonly onQrCode: (channel: ChannelData) => void
  readonly onDeactivate: (channel: ChannelData) => void
  readonly onEmbed?: (channel: ChannelData) => void
}

function ChannelRow({
  channel,
  onEdit,
  onQrCode,
  onDeactivate,
  onEmbed,
}: ChannelRowProps) {
  return (
    <TableRow>
      <TableCell>
        <span className="flex items-center gap-2 font-medium">
          <ChannelIcon channelType={channel.type} size={16} />
          {channel.name}
        </span>
      </TableCell>
      <TableCell>{channel.phoneNumber ?? '-'}</TableCell>
      <TableCell>
        {BROKER_TYPE_LABELS[channel.brokerType] ?? channel.brokerType}
      </TableCell>
      <TableCell>
        <ChannelStatusBadge status={channel.status} />
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="hover:bg-accent inline-flex h-10 w-10 items-center justify-center rounded-md"
            aria-label={`Ações do canal ${channel.name}`}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(channel)}>
              <Pencil />
              Editar
            </DropdownMenuItem>
            {channel.brokerType === 'BAILEYS' && (
              <DropdownMenuItem onClick={() => onQrCode(channel)}>
                <QrCode />
                QR Code
              </DropdownMenuItem>
            )}
            {channel.type === 'WEB_CHAT' && onEmbed && (
              <DropdownMenuItem onClick={() => onEmbed(channel)}>
                <Code />
                Código Embed
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDeactivate(channel)}
            >
              <Power />
              Desativar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export function ChannelsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Canal</TableHead>
          <TableHead>Número</TableHead>
          <TableHead>Conexão</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 3 }, (_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="size-8" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
