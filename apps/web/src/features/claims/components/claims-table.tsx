'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui/table'
import { useDebounce } from '@/hooks/use-debounce'

import type { ClaimPriority, ClaimStatus } from '../types'
import { useClaims, useDeleteClaim } from '../hooks/use-claims'
import { ClaimsPagination } from './claims-pagination'
import { ClaimsTableBody, ClaimsTableHeader } from './claims-table-rows'
import { ClaimsToolbar } from './claims-toolbar'
import { DeleteClaimDialog } from './delete-claim-dialog'

export function ClaimsTable() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [cursors, setCursors] = useState<string[]>([])
  const [deletingClaimId, setDeletingClaimId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 300)
  const currentCursor = cursors.at(-1)

  const { data, isLoading, isError, refetch } = useClaims({
    search: debouncedSearch || undefined,
    status: statusFilter === 'ALL' ? undefined : (statusFilter as ClaimStatus),
    priority:
      priorityFilter === 'ALL' ? undefined : (priorityFilter as ClaimPriority),
    cursor: currentCursor,
  })

  const deleteClaim = useDeleteClaim()

  function handleRowClick(id: string) {
    router.push(`/claims/${id}`)
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value)
    setCursors([])
  }

  function handlePriorityFilterChange(value: string) {
    setPriorityFilter(value)
    setCursors([])
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
    if (deletingClaimId) {
      deleteClaim.mutate(deletingClaimId, {
        onSuccess: () => setDeletingClaimId(null),
      })
    }
  }

  if (isError) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-md border">
        <p className="text-destructive text-sm">Erro ao carregar sinistros.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ClaimsToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={handlePriorityFilterChange}
      />

      <div className="rounded-md border">
        <Table>
          <ClaimsTableHeader />
          <ClaimsTableBody
            data={data?.data}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            onDelete={setDeletingClaimId}
          />
        </Table>
      </div>

      <ClaimsPagination
        total={data?.meta.total ?? 0}
        hasNextPage={Boolean(data?.meta.nextCursor)}
        hasPreviousPage={cursors.length > 0}
        onNext={handleNextPage}
        onPrevious={handlePreviousPage}
      />

      <DeleteClaimDialog
        open={Boolean(deletingClaimId)}
        onOpenChange={(open) => {
          if (!open) setDeletingClaimId(null)
        }}
        onConfirm={handleConfirmDelete}
        isPending={deleteClaim.isPending}
      />
    </div>
  )
}
