'use client'

import { ArrowLeft, Calendar, RefreshCw, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'
import { DetailInfoItem } from '@/components/shared/detail-info-item'
import { DocumentList } from '@/features/documents/components/document-list'
import { DocumentUpload } from '@/features/documents/components/document-upload'

import { useOrgs } from '@/features/org/hooks/use-orgs'
import { getInitials } from '@/lib/formatters'
import { formatDocument } from '@/lib/masks'
import { hasPermission } from '@/lib/permissions'
import { useClient, useDeleteClient } from '../hooks/use-clients'
import { PERSON_TYPE_BADGE_VARIANT, PERSON_TYPE_LABELS } from '../lib/constants'
import { DetailSkeleton } from './client-detail-skeleton'
import { ClientHistoryTab } from './client-history-tab'
import { ClientPoliciesTab } from './client-policies-tab'
import { ClientProposalsTab } from './client-proposals-tab'
import { LgpdDeleteDialogTrigger } from './lgpd-delete-dialog'

interface ClientDetailContentProps {
  readonly clientId: string
}

function formatAddress(
  address:
    | {
        street?: string | null
        number?: string | null
        complement?: string | null
        neighborhood?: string | null
        city?: string | null
        state?: string | null
        cep?: string | null
      }
    | null
    | undefined
): string {
  if (!address) return '-'
  const parts: string[] = []
  if (address.street) {
    parts.push(
      address.number ? `${address.street}, ${address.number}` : address.street
    )
  }
  if (address.complement) parts.push(address.complement)
  if (address.neighborhood) parts.push(address.neighborhood)
  if (address.city && address.state)
    parts.push(`${address.city}/${address.state}`)
  else if (address.city) parts.push(address.city)
  if (address.cep) parts.push(`CEP ${address.cep}`)
  return parts.length > 0 ? parts.join(' — ') : '-'
}

export function ClientDetailContent({ clientId }: ClientDetailContentProps) {
  const router = useRouter()
  const { activeOrg } = useOrgs()
  const { data: client, isLoading, isError, refetch } = useClient(clientId)
  const deleteClient = useDeleteClient()

  const [deleteOpen, setDeleteOpen] = useState(false)
  const canLgpdDelete = hasPermission(
    activeOrg?.role ?? 'VIEWER',
    'clients:lgpd-delete'
  )

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
          { label: client.legalName },
        ]}
      />

      <div className="rounded-lg border p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="size-12 shrink-0 text-lg font-semibold">
              <AvatarFallback>{getInitials(client.legalName)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {client.legalName}
                </h1>
                <Badge variant={PERSON_TYPE_BADGE_VARIANT[client.personType]}>
                  {PERSON_TYPE_LABELS[client.personType]}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {formatDocument(client.document)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
            {canLgpdDelete && (
              <LgpdDeleteDialogTrigger
                clientId={clientId}
                clientName={client.legalName}
              />
            )}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-4 sm:grid-cols-3">
          <DetailInfoItem label="Profissão" value={client.profession ?? '-'} />
          <DetailInfoItem
            label="Estado civil"
            value={client.maritalStatus ?? '-'}
          />
          <DetailInfoItem
            icon={<Calendar className="h-4 w-4" />}
            label="Cadastrado em"
            value={new Date(client.createdAt).toLocaleDateString('pt-BR')}
          />
          <DetailInfoItem
            label="Endereço"
            value={formatAddress(client.address)}
          />
          <DetailInfoItem
            label="Apólices ativas"
            value={String(client.activePolicyCount)}
          />
          <DetailInfoItem
            label="Contatos vinculados"
            value={String(client.contactCount)}
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
