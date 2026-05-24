'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

import { FormPageShell } from '@/components/shared/form-page-shell'
import { Button } from '@/components/ui/button'
import { ChannelEditForm } from '@/features/channels/components/channel-edit-form'
import { useChannel } from '@/features/channels/hooks/use-channels'

interface EditChannelPageProps {
  readonly params: Promise<{ id: string }>
}

export default function EditChannelPage({ params }: EditChannelPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: channel, isLoading, isError } = useChannel(id)
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    )
  }
  if (isError || !channel) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p role="alert" className="text-destructive text-sm">
          Canal não encontrado.
        </p>
        <Button
          variant="link"
          onClick={() => router.push('/settings?section=canais')}
        >
          Voltar para canais
        </Button>
      </div>
    )
  }
  return (
    <FormPageShell
      breadcrumb={[
        { label: 'Configurações', href: '/settings' },
        { label: 'Canais', href: '/settings?section=canais' },
        { label: channel.name },
        { label: 'Editar' },
      ]}
      title="Editar canal"
      description="Atualize as informações do canal."
      cardTitle="Dados do canal"
      cardDescription="Altere os campos necessários e salve."
    >
      <ChannelEditForm
        initial={channel}
        onSuccess={() => router.push('/settings?section=canais')}
        onCancel={() => router.push('/settings?section=canais')}
      />
    </FormPageShell>
  )
}
