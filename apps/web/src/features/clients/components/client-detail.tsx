'use client'

import {
  ArrowLeft,
  Calendar,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs'

import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'
import { DetailInfoItem } from '@/components/shared/detail-info-item'
import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { DocumentList } from '@/features/documents/components/document-list'
import { DocumentUpload } from '@/features/documents/components/document-upload'

import { getInitials } from '@/lib/formatters'
import { formatDocument } from '@/lib/masks'
import { useClient, useDeleteClient } from '../hooks/use-clients'
import { TYPE_BADGE_VARIANT, TYPE_LABELS } from '../lib/constants'
import { DetailSkeleton } from './client-detail-skeleton'
import { ClientHistoryTab } from './client-history-tab'
import { ClientPoliciesTab } from './client-policies-tab'
import { ClientProposalsTab } from './client-proposals-tab'

interface ClientDetailContentProps {
  readonly clientId: string
}

export function ClientDetailContent({ clientId }: ClientDetailContentProps) {
  const router = useRouter()
  const { data: client, isLoading, isError, refetch } = useClient(clientId)
  const deleteClient = useDeleteClient()

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
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clientes', href: '/clients' },
          { label: client.name },
        ]}
      />

      <div className="rounded-lg border p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="size-12 shrink-0 text-lg font-semibold">
              <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {client.name}
                </h1>
                <Badge variant={TYPE_BADGE_VARIANT[client.type]}>
                  {TYPE_LABELS[client.type]}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {formatDocument(client.document)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/clients/${clientId}/edit`)}
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
          <DetailInfoItem
            icon={<Mail className="h-4 w-4" />}
            label="E-mail"
            value={client.email ?? '-'}
          />
          <DetailInfoItem
            icon={<Phone className="h-4 w-4" />}
            label="Telefone"
            value={client.phone ?? '-'}
          />
          <DetailInfoItem
            icon={<Calendar className="h-4 w-4" />}
            label="Criado em"
            value={new Date(client.createdAt).toLocaleDateString('pt-BR')}
          />
        </div>
      </div>

      <Tabs defaultValue="proposals">
        <TabsList>
          <TabsTab value="proposals">Propostas</TabsTab>
          <TabsTab value="policies">Apólices</TabsTab>
          <TabsTab value="documents">Documentos</TabsTab>
          <TabsTab value="history">Histórico</TabsTab>
        </TabsList>

        <TabsContent value="proposals" className="mt-4">
          <ClientProposalsTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="policies" className="mt-4">
          <ClientPoliciesTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <DocumentUpload entityType="CLIENT" entityId={clientId} />
          <DocumentList entityType="CLIENT" entityId={clientId} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <ClientHistoryTab clientId={clientId} />
        </TabsContent>
      </Tabs>

      <ConfirmDeleteDialog
        entityLabel="cliente"
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
        isPending={deleteClient.isPending}
      />
    </div>
  )
}
