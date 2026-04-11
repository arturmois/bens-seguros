'use client'

import { Globe, MessageCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { ChannelIcon } from '@/features/chat/components/channel-icon'
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

  // Handle redirect from Meta OAuth callback (GET /meta/auth/callback → redirect here with meta_session)
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

  function handleMessengerSuccess() {
    setActiveOAuthChannel('MESSENGER')
    setAssetSelectOpen(true)
  }

  function handleInstagramSuccess() {
    setActiveOAuthChannel('INSTAGRAM')
    setAssetSelectOpen(true)
  }

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Canais</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie seus canais de comunicação.
        </p>
      </div>

      <section aria-labelledby="connect-channels-heading">
        <h3
          id="connect-channels-heading"
          className="text-muted-foreground mb-4 text-sm font-medium"
        >
          Conectar novo canal
        </h3>
        <ChannelCards
          onWhatsAppConnect={() => setWhatsAppMethodOpen(true)}
          onMessengerSuccess={handleMessengerSuccess}
          onInstagramSuccess={handleInstagramSuccess}
          onWebChatConnect={handleWebChatConnect}
        />
      </section>

      <section
        aria-labelledby="connected-channels-heading"
        className="flex min-h-0 flex-1 flex-col"
      >
        <h3
          id="connected-channels-heading"
          className="text-muted-foreground mb-4 text-sm font-medium"
        >
          Canais conectados
        </h3>
        <ChannelsTable
          onEdit={handleEdit}
          onQrCode={handleQrCode}
          onEmbed={handleEmbed}
          onDeactivate={handleDeactivate}
        />
      </section>

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

interface ChannelCardsProps {
  readonly onWhatsAppConnect: () => void
  readonly onMessengerSuccess: () => void
  readonly onInstagramSuccess: () => void
  readonly onWebChatConnect: () => void
}

function ChannelCards({
  onWhatsAppConnect,
  // onMessengerSuccess,
  // onInstagramSuccess,
  onWebChatConnect,
}: ChannelCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <div className="mb-2">
            <ChannelIcon channelType="WHATSAPP" size={28} />
          </div>
          <CardTitle className="text-base">WhatsApp</CardTitle>
          <CardDescription>
            Conecte via QR code ou código de pareamento.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" size="sm" onClick={onWhatsAppConnect}>
            <ChannelIcon channelType="WHATSAPP" size={16} />
            Conectar
          </Button>
        </CardFooter>
      </Card>

      {/* <Card>
        <CardHeader>
          <div className="mb-2">
            <ChannelIcon channelType="MESSENGER" size={28} />
          </div>
          <CardTitle className="text-base">Messenger</CardTitle>
          <CardDescription>
            Conecte sua página do Facebook via OAuth.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <MetaOAuthButton
            channelType="MESSENGER"
            onSuccess={onMessengerSuccess}
          />
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="mb-2">
            <ChannelIcon channelType="INSTAGRAM" size={28} />
          </div>
          <CardTitle className="text-base">Instagram</CardTitle>
          <CardDescription>
            Conecte sua conta do Instagram via OAuth.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <MetaOAuthButton
            channelType="INSTAGRAM"
            onSuccess={onInstagramSuccess}
          />
        </CardFooter>
      </Card> */}

      <Card>
        <CardHeader>
          <div className="mb-2">
            <Globe size={28} className="text-muted-foreground" />
          </div>
          <CardTitle className="text-base">Web Chat</CardTitle>
          <CardDescription>
            Adicione um widget de chat ao seu site.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" size="sm" onClick={onWebChatConnect}>
            <MessageCircle className="size-4" />
            Configurar
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
