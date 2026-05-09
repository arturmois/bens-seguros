'use client'

import type { VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ClipboardList } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import type { FilterValue } from '@/components/shared/filter-types'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { UnifiedFilterBar } from '@/components/shared/unified-filter-bar'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'

import { useAuditFilters } from '../hooks/use-audit-filters'
import { useAuditLogs } from '../hooks/use-audit-logs'
import { DEFAULT_COLUMN_VISIBILITY, HIDEABLE_COLUMNS } from '../lib/constants'
import { AUDIT_FILTERS } from '../lib/filters'
import type { AuditLogData } from '../lib/types'
import { AuditCard } from './audit-card'
import { createAuditColumns } from './audit-columns'
import { AuditDetailModal } from './audit-detail-modal'

export function AuditTable() {
  'use no memo'
  const pagination = useCursorPagination(30)
  const filters = useAuditFilters()

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [selectedEntry, setSelectedEntry] = useState<AuditLogData | null>(null)

  const filterFingerprint = JSON.stringify(filters.apiParams)
  const lastFingerprint = useRef(filterFingerprint)
  useEffect(() => {
    if (lastFingerprint.current === filterFingerprint) return
    lastFingerprint.current = filterFingerprint
    pagination.reset()
  }, [filterFingerprint, pagination])

  const { data, isLoading, isError, refetch } = useAuditLogs({
    actionIn: filters.apiParams.actionIn,
    entityTypeIn: filters.apiParams.entityTypeIn,
    dateFrom: filters.apiParams.dateFrom,
    dateTo: filters.apiParams.dateTo,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
  })

  const entries: AuditLogData[] = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const nextCursor = data?.meta?.nextCursor ?? null

  const columnActions = useMemo(
    () => ({ onView: (entry: AuditLogData) => setSelectedEntry(entry) }),
    []
  )

  const columns = useMemo(
    () => createAuditColumns(columnActions),
    [columnActions]
  )

  const table = useReactTable({
    data: entries,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
    rowCount: total,
  })

  function handleFilterChange(key: string, value: FilterValue) {
    filters.setFilter(key, value)
  }

  function handleColumnToggle(id: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
  }

  if (isError) {
    return (
      <TableErrorState
        message="Erro ao carregar registros de auditoria."
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <UnifiedFilterBar
        hideSearch
        filters={AUDIT_FILTERS}
        values={filters.values}
        onFilterChange={handleFilterChange}
        onClearAll={filters.clearAll}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      />

      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={
          <ClipboardList className="text-muted-foreground/50 size-10" />
        }
        emptyMessage="Nenhum registro de auditoria encontrado."
        columnVisibility={columnVisibility}
        onRowClick={(entry) => setSelectedEntry(entry)}
      />

      <MobileCardList
        data={entries}
        keyExtractor={(e) => e.id}
        isLoading={isLoading}
        emptyIcon={
          <ClipboardList className="text-muted-foreground/50 size-10" />
        }
        emptyMessage="Nenhum registro de auditoria encontrado."
        renderCard={(entry) => (
          <AuditCard entry={entry} onView={setSelectedEntry} />
        )}
      />

      <CursorPagination
        total={total}
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

      <AuditDetailModal
        entry={selectedEntry}
        open={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  )
}
