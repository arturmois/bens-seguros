'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Mail,
  Phone,
  Pencil,
  Trash2,
  Calendar,
  RefreshCw,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs'

import { DocumentList } from '@/features/documents/components/document-list'
import { DocumentUpload } from '@/features/documents/components/document-upload'

import { TYPE_BADGE_VARIANT, TYPE_LABELS } from '../lib/constants'
import { useClient, useDeleteClient } from '../hooks/use-clients'
import { ClientForm } from './client-form'
import { DeleteClientDialog } from './delete-client-dialog'

interface ClientDetailContentProps {
  readonly clientId: string
}

export function ClientDetailContent({ clientId }: ClientDetailContentProps) {
  const router = useRouter()
  const { data: client, isLoading, isError } = useClient(clientId)
  const deleteClient = useDeleteClient()

  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  function handleConfirmDelete() {
    deleteClient.mutate(clientId, {
      onSuccess: () => {
        setDeleteOpen(false)
        router.push('/clients')
      },
    })
  }

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (isError || !client) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-destructive text-sm">
          Erro ao carregar os dados do cliente.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/clients')}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/clients')}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Clientes
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{client.name}</span>
      </nav>

      <div className="rounded-lg border p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {client.name}
              </h1>
              <Badge variant={TYPE_BADGE_VARIANT[client.type]}>
                {TYPE_LABELS[client.type]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">{client.document}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFormOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 sm:grid-cols-3">
          <InfoItem
            icon={<Mail className="h-4 w-4" />}
            label="E-mail"
            value={client.email ?? '-'}
          />
          <InfoItem
            icon={<Phone className="h-4 w-4" />}
            label="Telefone"
            value={client.phone ?? '-'}
          />
          <InfoItem
            icon={<Calendar className="h-4 w-4" />}
            label="Criado em"
            value={new Date(client.createdAt).toLocaleDateString('pt-BR')}
          />
        </div>
      </div>

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTab value="documents">Documentos</TabsTab>
        </TabsList>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <DocumentUpload entityType="CLIENT" entityId={clientId} />
          <DocumentList entityType="CLIENT" entityId={clientId} />
        </TabsContent>
      </Tabs>

      <ClientForm
        open={formOpen}
        onOpenChange={setFormOpen}
        clientId={client.id}
        defaultValues={{
          name: client.name,
          document: client.document,
          type: client.type,
          email: client.email ?? '',
          phone: client.phone ?? '',
          birthDate: client.birthDate
            ? (() => {
                const d = new Date(client.birthDate)
                const year = d.getUTCFullYear()
                const month = String(d.getUTCMonth() + 1).padStart(2, '0')
                const day = String(d.getUTCDate()).padStart(2, '0')
                return `${year}-${month}-${day}`
              })()
            : '',
          profession: client.profession ?? '',
          maritalStatus: client.maritalStatus ?? undefined,
          socialMedia: {
            instagram: client.socialMedia?.instagram ?? '',
            facebook: client.socialMedia?.facebook ?? '',
            linkedin: client.socialMedia?.linkedin ?? '',
            tiktok: client.socialMedia?.tiktok ?? '',
          },
        }}
      />

      <DeleteClientDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
        isPending={deleteClient.isPending}
      />
    </div>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  readonly icon: React.ReactNode
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-20" />
      <div className="rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Separator className="my-6" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
