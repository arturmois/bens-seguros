'use client'

import { useCallback, useState } from 'react'
import { AlertTriangle, Plus, Radio } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

import type { ChannelData } from '../types'
import { useChannels } from '../hooks/use-channels'
import { ChannelFormSheet } from './channel-form-sheet'
import { ChannelQrDialog } from './channel-qr-dialog'
import { ChannelsTable, ChannelsTableSkeleton } from './channels-table'
import { DeactivateChannelDialog } from './deactivate-channel-dialog'

export function ChannelsPage() {
  const { data: channels, isLoading, isError, refetch } = useChannels()

  const [formOpen, setFormOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<ChannelData | undefined>(
    undefined
  )
  const [qrChannel, setQrChannel] = useState<ChannelData | null>(null)
  const [deactivateChannel, setDeactivateChannel] =
    useState<ChannelData | null>(null)

  const handleEdit = useCallback((channel: ChannelData) => {
    setEditingChannel(channel)
    setFormOpen(true)
  }, [])

  const handleCreate = useCallback(() => {
    setEditingChannel(undefined)
    setFormOpen(true)
  }, [])

  const handleQrCode = useCallback((channel: ChannelData) => {
    setQrChannel(channel)
  }, [])

  const handleDeactivate = useCallback((channel: ChannelData) => {
    setDeactivateChannel(channel)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Canais WhatsApp
          </h2>
          <p className="text-muted-foreground text-sm">
            Gerencie seus canais de comunicação via WhatsApp.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 size-4" />
          Novo Canal
        </Button>
      </div>

      <ChannelsContent
        channels={channels}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onQrCode={handleQrCode}
        onDeactivate={handleDeactivate}
      />

      <ChannelFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        channel={editingChannel}
      />

      <ChannelQrDialog
        open={qrChannel !== null}
        onOpenChange={(open) => {
          if (!open) setQrChannel(null)
        }}
        channel={qrChannel}
      />

      <DeactivateChannelDialog
        open={deactivateChannel !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivateChannel(null)
        }}
        channel={deactivateChannel}
      />
    </div>
  )
}

interface ChannelsContentProps {
  readonly channels: readonly ChannelData[] | undefined
  readonly isLoading: boolean
  readonly isError: boolean
  readonly onRetry: () => void
  readonly onCreate: () => void
  readonly onEdit: (channel: ChannelData) => void
  readonly onQrCode: (channel: ChannelData) => void
  readonly onDeactivate: (channel: ChannelData) => void
}

function ChannelsContent({
  channels,
  isLoading,
  isError,
  onRetry,
  onCreate,
  onEdit,
  onQrCode,
  onDeactivate,
}: ChannelsContentProps) {
  if (isLoading) {
    return <ChannelsTableSkeleton />
  }

  if (isError) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle />
          </EmptyMedia>
          <EmptyTitle>Erro ao carregar canais</EmptyTitle>
          <EmptyDescription>
            Não foi possível carregar os canais. Tente novamente.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      </Empty>
    )
  }

  if (!channels || channels.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Radio />
          </EmptyMedia>
          <EmptyTitle>Nenhum canal cadastrado</EmptyTitle>
          <EmptyDescription>
            Adicione seu primeiro canal WhatsApp para começar a receber
            mensagens.
          </EmptyDescription>
        </EmptyHeader>
        <Button onClick={onCreate}>
          <Plus className="mr-2 size-4" />
          Novo Canal
        </Button>
      </Empty>
    )
  }

  return (
    <ChannelsTable
      channels={channels}
      onEdit={onEdit}
      onQrCode={onQrCode}
      onDeactivate={onDeactivate}
    />
  )
}
