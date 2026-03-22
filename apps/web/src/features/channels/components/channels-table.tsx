'use client'

import { MoreHorizontal, Pencil, Power, QrCode } from 'lucide-react'

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

import type { ChannelData } from '../types'
import { ChannelStatusBadge } from './channel-status-badge'

interface ChannelsTableProps {
  readonly channels: readonly ChannelData[]
  readonly onEdit: (channel: ChannelData) => void
  readonly onQrCode: (channel: ChannelData) => void
  readonly onDeactivate: (channel: ChannelData) => void
}

const BROKER_TYPE_LABELS: Record<string, string> = {
  BAILEYS: 'Baileys',
  META: 'Meta',
}

export function ChannelsTable({
  channels,
  onEdit,
  onQrCode,
  onDeactivate,
}: ChannelsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Numero</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Acoes</span>
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
}

function ChannelRow({
  channel,
  onEdit,
  onQrCode,
  onDeactivate,
}: ChannelRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{channel.name}</TableCell>
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
            aria-label={`Acoes do canal ${channel.name}`}
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
          <TableHead>Nome</TableHead>
          <TableHead>Numero</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Acoes</span>
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
