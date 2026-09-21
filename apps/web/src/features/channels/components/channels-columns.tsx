'use client'

import type { ColumnDef } from '@tanstack/react-table'
import {
  ArrowUpDown,
  Code,
  MoreHorizontal,
  Pencil,
  Power,
  QrCode,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'

import { hasPermission } from '@/lib/permissions'
import type { Role } from '@repo/auth/roles'
import { ChannelIcon } from '@/features/chat/components/channel-icon'
import { BROKER_TYPE_LABELS } from '../lib/constants'
import type { ChannelData } from '../types'
import { ChannelStatusBadge } from './channel-status-badge'

interface ColumnActions {
  readonly onEdit: (channel: ChannelData) => void
  readonly onQrCode: (channel: ChannelData) => void
  readonly onEmbed: (channel: ChannelData) => void
  readonly onDeactivate: (channel: ChannelData) => void
}

export function createChannelColumns(
  actions: ColumnActions,
  role: Role
): ColumnDef<ChannelData>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <button
          type="button"
          className="-ms-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-foreground"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Canal
          <ArrowUpDown className="size-3.5 opacity-40" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="flex items-center gap-2 font-medium">
          <ChannelIcon channelType={row.original.type} size={16} />
          {row.original.name}
        </span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: 'phoneNumber',
      header: 'Número',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.phoneNumber ?? '-'}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'brokerType',
      header: 'Conexão',
      cell: ({ row }) =>
        BROKER_TYPE_LABELS[row.original.brokerType] ?? row.original.brokerType,
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <ChannelStatusBadge status={row.original.status} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const channel = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Ações do canal ${channel.name}`}
                />
              }
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hasPermission(role, 'settings:manage') && (
                <DropdownMenuItem onClick={() => actions.onEdit(channel)}>
                  <Pencil className="mr-2 size-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {channel.brokerType === 'BAILEYS' && (
                <DropdownMenuItem onClick={() => actions.onQrCode(channel)}>
                  <QrCode className="mr-2 size-4" />
                  QR Code
                </DropdownMenuItem>
              )}
              {channel.type === 'WEB_CHAT' && (
                <DropdownMenuItem onClick={() => actions.onEmbed(channel)}>
                  <Code className="mr-2 size-4" />
                  Código Embed
                </DropdownMenuItem>
              )}
              {hasPermission(role, 'settings:manage') && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => actions.onDeactivate(channel)}
                >
                  <Power className="mr-2 size-4" />
                  Desativar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableSorting: false,
      enableHiding: false,
      size: 40,
    },
  ]
}
