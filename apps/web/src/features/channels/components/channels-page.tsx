'use client'

import { Globe, Plus } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'

import { ChannelIcon } from '@/features/chat/components/channel-icon'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { hasPermission } from '@/lib/permissions'
import { useChannels } from '../hooks/use-channels'
import { useMetaOAuth } from '../hooks/use-meta-oauth'
import type { ChannelData } from '../types'
import { ChannelFormDialog } from './channel-form-dialog'
import { ChannelQrDialog } from './channel-qr-dialog'
import { ChannelsTable } from './channels-table'
import { DeactivateChannelDialog } from './deactivate-channel-dialog'
import { EmbedCodeDialog } from './embed-code-dialog'
import { MetaAssetSelect } from './meta-asset-select'
import { MetaEmbeddedSignup } from './meta-embedded-signup'
import { WhatsAppMethodDialog } from './whatsapp-method-dialog'

type ActiveOAuthChannel = 'MESSENGER' | 'INSTAGRAM' | null

export function ChannelsPage() {
  const { activeOrg } = useOrgs()
  const role = activeOrg?.role ?? 'VIEWER'
  const canManage = hasPermission(role, 'settings:manage')
  const { refetch } = useChannels()
  const [formOpen, setFormOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<ChannelData | undefined>(
    undefined
  )
  const [qrChannel, setQrChannel] = useState<ChannelData | null>(null)
  const [deactivateChannel, setDeactivateChannel] =
    useState<ChannelData | null>(null)
  const [embedChannelId, setEmbedChannelId] = useState<string | null>(null)
  const [activeOAuthChannel, setActiveOAuthChannel] =
    useState<ActiveOAuthChannel>(null)
  const [assetSelectOpen, setAssetSelectOpen] = useState(false)
  const [whatsAppMethodOpen, setWhatsAppMethodOpen] = useState(false)
  const [embeddedSignupOpen, setEmbeddedSignupOpen] = useState(false)
  const searchParams = useSearchParams()
  const messengerOAuth = useMetaOAuth()
  const instagramOAuth = useMetaOAuth()
  const activeOAuth =
    activeOAuthChannel === 'MESSENGER' ? messengerOAuth : instagramOAuth
  const hasProcessedRef = useRef(false)
  useEffect(() => {
    if (hasProcessedRef.current) return
    const metaSession = searchParams.get('meta_session')
    const metaChannelType = searchParams.get('meta_channel_type') as
      | 'MESSENGER'
      | 'INSTAGRAM'
      | null
    const metaError = searchParams.get('meta_error')
    if (metaError) {
      hasProcessedRef.current = true
      toast.error(`Erro na autenticação Meta: ${metaError}`)
      window.history.replaceState({}, '', '/settings?section=canais')
      return
    }
    if (metaSession && metaChannelType) {
      hasProcessedRef.current = true
      const oauth =
        metaChannelType === 'MESSENGER' ? messengerOAuth : instagramOAuth
      oauth.handleRedirectSession(metaSession)
      setActiveOAuthChannel(metaChannelType)
      setAssetSelectOpen(true)
      window.history.replaceState({}, '', '/settings?section=canais')
    }
  }, [searchParams, messengerOAuth, instagramOAuth])
  const handleEdit = useCallback((channel: ChannelData) => {
    setEditingChannel(channel)
    setFormOpen(true)
  }, [])
  const handleWebChatConnect = useCallback(() => {
    setEditingChannel(undefined)
    setFormOpen(true)
  }, [])
  const handleQrCode = useCallback((channel: ChannelData) => {
    setQrChannel(channel)
  }, [])
  const handleDeactivate = useCallback((channel: ChannelData) => {
    setDeactivateChannel(channel)
  }, [])
  const handleEmbed = useCallback((channel: ChannelData) => {
    setEmbedChannelId(channel.id)
  }, [])
  function handleAssetCancel() {
    setAssetSelectOpen(false)
    setActiveOAuthChannel(null)
    activeOAuth.reset()
  }
  function handleAssetConnect(input: {
    pageId: string
    name: string
    channelType: 'MESSENGER' | 'INSTAGRAM'
    instagramAccountId?: string
  }) {
    void activeOAuth.connectChannel(input).then(() => {
      setAssetSelectOpen(false)
      setActiveOAuthChannel(null)
      void refetch()
    })
  }
  const headerAction = canManage ? (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button />}>
        <Plus className="size-4" />
        Conectar canal
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setWhatsAppMethodOpen(true)}>
          <ChannelIcon channelType="WHATSAPP" size={16} />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWebChatConnect}>
          <Globe className="size-4" />
          Web Chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Canais</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie seus canais de comunicação.
        </p>
      </div>
      <ChannelsTable
        onEdit={handleEdit}
        onQrCode={handleQrCode}
        onEmbed={handleEmbed}
        onDeactivate={handleDeactivate}
        headerAction={headerAction}
      />
      <ChannelFormDialog
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
      <EmbedCodeDialog
        open={embedChannelId !== null}
        onOpenChange={(open) => {
          if (!open) setEmbedChannelId(null)
        }}
        channelId={embedChannelId}
      />
      {activeOAuthChannel && (
        <MetaAssetSelect
          open={assetSelectOpen}
          onOpenChange={(open) => {
            if (!open) handleAssetCancel()
          }}
          assets={activeOAuth.assets}
          channelType={activeOAuthChannel}
          onConnect={handleAssetConnect}
          onCancel={handleAssetCancel}
        />
      )}
      <WhatsAppMethodDialog
        open={whatsAppMethodOpen}
        onOpenChange={setWhatsAppMethodOpen}
        onSelectQrCode={() => {
          setWhatsAppMethodOpen(false)
          setEditingChannel(undefined)
          setFormOpen(true)
        }}
        onSelectCloudApi={() => setEmbeddedSignupOpen(true)}
      />
      <Dialog open={embeddedSignupOpen} onOpenChange={setEmbeddedSignupOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp Business</DialogTitle>
          </DialogHeader>
          <MetaEmbeddedSignup
            onSuccess={() => {
              setEmbeddedSignupOpen(false)
              void refetch()
            }}
            onCancel={() => setEmbeddedSignupOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
