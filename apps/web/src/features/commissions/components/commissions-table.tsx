'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui/table'
import { useDebounce } from '@/hooks/use-debounce'

import type { CommissionStatus } from '../lib/constants'
import { useCommissions } from '../hooks/use-commissions'
import { CommissionsPagination } from './commissions-pagination'
import {
  CommissionsTableBody,
  CommissionsTableHeader,
} from './commissions-table-rows'
import { CommissionsToolbar } from './commissions-toolbar'

export function CommissionsTable() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | 'ALL'>(
    'ALL'
  )
  const [cursors, setCursors] = useState<string[]>([])

  const debouncedSearch = useDebounce(search, 300)
  const currentCursor = cursors.at(-1)

  const filters = {
    search: debouncedSearch || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    cursor: currentCursor,
  }

  const { data, isLoading, isError, refetch } = useCommissions(filters)

  function handleRowClick(id: string) {
    router.push(`/commissions/${id}`)
  }

  function handleStatusFilterChange(value: CommissionStatus | 'ALL') {
    setStatusFilter(value)
    setCursors([])
  }

  function handleNextPage() {
    const next = data?.meta.nextCursor
    if (next) {
      setCursors((prev) => [...prev, next])
    }
  }

  function handlePreviousPage() {
    setCursors((prev) => prev.slice(0, -1))
  }

  if (isError) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-md border">
        <p className="text-destructive text-sm">Erro ao carregar comissões.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <CommissionsToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        currentFilters={filters}
      />

      <div className="rounded-md border">
        <Table>
          <CommissionsTableHeader />
          <CommissionsTableBody
            data={data?.data}
            isLoading={isLoading}
            onRowClick={handleRowClick}
          />
        </Table>
      </div>

      <CommissionsPagination
        total={data?.meta.total ?? 0}
        hasNextPage={Boolean(data?.meta.nextCursor)}
        hasPreviousPage={cursors.length > 0}
        onNext={handleNextPage}
        onPrevious={handlePreviousPage}
      />
    </div>
  )
}
