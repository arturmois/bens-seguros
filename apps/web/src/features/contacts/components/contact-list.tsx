'use client'

import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { ListContactsConsentLgpd } from '@/api/model'
import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import type { FilterValue } from '@/components/shared/filter-types'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { UnifiedFilterBar } from '@/components/shared/unified-filter-bar'
import { Button } from '@/components/ui/button'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import { useContacts } from '../hooks/use-contacts'
import { useContactsFilters } from '../hooks/use-contacts-filters'
import { CONTACT_FILTERS } from '../lib/filters'
import type { ContactListItem } from '../lib/types'
import { ContactCard } from './contact-card'
import { createContactsColumns } from './contacts-columns'
import { CreateContactDialog } from './create-contact-dialog'

function toConsentLgpdParam(
  value: boolean | undefined
):
  | (typeof ListContactsConsentLgpd)[keyof typeof ListContactsConsentLgpd]
  | undefined {
  if (value === undefined) return undefined
  return value ? ListContactsConsentLgpd.true : ListContactsConsentLgpd.false
}

export function ContactList() {
  'use no memo'
  const router = useRouter()
  const pagination = useCursorPagination()
  const filters = useContactsFilters()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  function handleContactCreated(contactId: string) {
    setCreateDialogOpen(false)
    router.push(`/contacts/${contactId}`)
  }
  const debouncedSearch = useDebounce(filters.search, 300)
  const { data, isLoading, isError, refetch } = useContacts({
    ...filters.apiParams,
    consentLgpd: toConsentLgpdParam(filters.apiParams.consentLgpd),
    search: debouncedSearch || undefined,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
  })
  const contacts: ContactListItem[] = data?.data ?? []
  const nextCursor = data?.meta?.nextCursor ?? null
  const knownTotal =
    (pagination.currentPage - 1) * pagination.pageSize + contacts.length
  const columns = useMemo(() => createContactsColumns(), [])
  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
  })
  function handleSearchChange(value: string) {
    filters.setSearch(value)
    pagination.reset()
  }
  function handleFilterChange(key: string, value: FilterValue) {
    filters.setFilter(key, value)
    pagination.reset()
  }
  function handleClearAll() {
    filters.clearAll()
    pagination.reset()
  }
  if (isError) {
    return (
      <TableErrorState message="Erro ao carregar contatos." onRetry={refetch} />
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <UnifiedFilterBar
        searchValue={filters.search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar por nome, telefone ou email"
        filters={CONTACT_FILTERS}
        values={filters.values}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAll}
      >
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">Novo contato</span>
        </Button>
      </UnifiedFilterBar>
      <DataTable
        table={table}
        isLoading={isLoading}
        emptyMessage="Nenhum contato encontrado."
        onRowClick={(contact) => router.push(`/contacts/${contact.id}`)}
      />
      <MobileCardList
        data={contacts}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="Nenhum contato encontrado."
        renderCard={(contact) => <ContactCard contact={contact} />}
      />
      <CursorPagination
        total={knownTotal}
        pageSize={pagination.pageSize}
        currentPage={pagination.currentPage}
        onPageSizeChange={pagination.setPageSize}
        hasPreviousPage={pagination.hasPreviousPage}
        hasNextPage={Boolean(nextCursor)}
        onPrevious={pagination.goToPrevious}
        onNext={() => {
          if (nextCursor) pagination.goToNext(nextCursor)
        }}
      />
      <CreateContactDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleContactCreated}
      />
    </div>
  )
}
