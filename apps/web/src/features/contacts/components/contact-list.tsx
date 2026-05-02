'use client'

import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import { useContacts } from '../hooks/use-contacts'
import { CONTACT_SOURCE_OPTIONS, CONTACT_STAGE_OPTIONS } from '../lib/constants'
import type { ContactListItem, ContactSource, ContactStage } from '../lib/types'
import { ContactCard } from './contact-card'
import { createContactsColumns } from './contacts-columns'

const ALL_VALUE = '__all__'
const STAGE_FILTER_OPTIONS = [
  { value: ALL_VALUE, label: 'Todos os estágios' },
  ...CONTACT_STAGE_OPTIONS,
] as const
const SOURCE_FILTER_OPTIONS = [
  { value: ALL_VALUE, label: 'Todas as origens' },
  ...CONTACT_SOURCE_OPTIONS,
] as const

export function ContactList() {
  'use no memo'
  const router = useRouter()
  const pagination = useCursorPagination()

  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>(ALL_VALUE)
  const [sourceFilter, setSourceFilter] = useState<string>(ALL_VALUE)

  const debouncedSearch = useDebounce(search, 300)

  const stage =
    stageFilter !== ALL_VALUE ? (stageFilter as ContactStage) : undefined
  const source =
    sourceFilter !== ALL_VALUE ? (sourceFilter as ContactSource) : undefined

  const { data, isLoading, isError, refetch } = useContacts({
    search: debouncedSearch || undefined,
    stage,
    source,
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
    setSearch(value)
    pagination.reset()
  }

  function handleStageChange(value: string | null) {
    if (value === null) return
    setStageFilter(value)
    pagination.reset()
  }

  function handleSourceChange(value: string | null) {
    if (value === null) return
    setSourceFilter(value)
    pagination.reset()
  }

  if (isError) {
    return (
      <TableErrorState message="Erro ao carregar contatos." onRetry={refetch} />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <TableToolbar
        search={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Buscar por nome, telefone ou email"
        filters={
          <>
            <Select
              value={stageFilter}
              onValueChange={handleStageChange}
              items={STAGE_FILTER_OPTIONS}
            >
              <SelectTrigger className="h-8 w-full sm:w-44" size="sm">
                <SelectValue placeholder="Estágio">
                  {(value: string | null) => {
                    const item = STAGE_FILTER_OPTIONS.find(
                      (option) => option.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STAGE_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sourceFilter}
              onValueChange={handleSourceChange}
              items={SOURCE_FILTER_OPTIONS}
            >
              <SelectTrigger className="h-8 w-full sm:w-44" size="sm">
                <SelectValue placeholder="Origem">
                  {(value: string | null) => {
                    const item = SOURCE_FILTER_OPTIONS.find(
                      (option) => option.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SOURCE_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

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
    </div>
  )
}
