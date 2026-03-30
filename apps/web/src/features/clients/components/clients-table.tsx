'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui/table'
import { useDebounce } from '@/hooks/use-debounce'

import type { ClientData, ClientType } from '../lib/constants'
import { useClients, useDeleteClient } from '../hooks/use-clients'
import { ClientForm } from './client-form'
import { ClientsPagination } from './clients-pagination'
import { ClientsTableBody, ClientsTableHeader } from './clients-table-rows'
import { ClientsToolbar } from './clients-toolbar'
import { DeleteClientDialog } from './delete-client-dialog'

export function ClientsContent() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [cursors, setCursors] = useState<string[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientData | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const currentCursor = cursors.at(-1)

  const { data, isLoading, isError, refetch } = useClients({
    search: debouncedSearch || undefined,
    type: typeFilter === 'ALL' ? undefined : (typeFilter as ClientType),
    cursor: currentCursor,
  })

  const deleteClient = useDeleteClient()

  function handleRowClick(id: string) {
    router.push(`/clients/${id}`)
  }

  function handleEdit(client: ClientData) {
    setEditingClient(client)
    setFormOpen(true)
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open)
    if (!open) setEditingClient(null)
  }

  function handleNextPage() {
    if (data?.meta.nextCursor) {
      setCursors((prev) => [...prev, data.meta.nextCursor!])
    }
  }

  function handlePreviousPage() {
    setCursors((prev) => prev.slice(0, -1))
  }

  function handleConfirmDelete() {
    if (deletingClientId) {
      deleteClient.mutate(deletingClientId, {
        onSuccess: () => setDeletingClientId(null),
      })
    }
  }

  if (isError) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-md border">
        <p className="text-destructive text-sm">Erro ao carregar clientes.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ClientsToolbar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={(val) => {
          setTypeFilter(val)
          setCursors([])
        }}
        onNewClient={() => {
          setEditingClient(null)
          setFormOpen(true)
        }}
        currentFilters={{
          search: debouncedSearch || undefined,
          type: typeFilter === 'ALL' ? undefined : (typeFilter as ClientType),
        }}
      />

      <div className="rounded-md border">
        <Table>
          <ClientsTableHeader />
          <ClientsTableBody
            data={data?.data}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            onEdit={handleEdit}
            onDelete={setDeletingClientId}
          />
        </Table>
      </div>

      <ClientsPagination
        total={data?.meta.total ?? 0}
        hasNextPage={Boolean(data?.meta.nextCursor)}
        hasPreviousPage={cursors.length > 0}
        onNext={handleNextPage}
        onPrevious={handlePreviousPage}
      />

      <ClientForm
        open={formOpen}
        onOpenChange={handleFormClose}
        clientId={editingClient?.id}
        defaultValues={
          editingClient
            ? {
                name: editingClient.name,
                document: editingClient.document,
                type: editingClient.type,
                email: editingClient.email ?? '',
                phone: editingClient.phone ?? '',
              }
            : undefined
        }
      />

      <DeleteClientDialog
        open={Boolean(deletingClientId)}
        onOpenChange={(open) => {
          if (!open) setDeletingClientId(null)
        }}
        onConfirm={handleConfirmDelete}
        isPending={deleteClient.isPending}
      />
    </div>
  )
}
