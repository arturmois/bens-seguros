'use client'

import type { VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ClipboardList } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import { FilterTabs } from '@/components/shared/filter-tabs'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import {
  isPeriodFilter,
  PERIOD_FILTER_OPTIONS,
  resolvePeriodRange,
  type PeriodFilter,
} from '@/components/shared/period-filter'
import { TableErrorState } from '@/components/shared/table-error-state'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'

import { useAuditLogs } from '../hooks/use-audit-logs'
import { DEFAULT_COLUMN_VISIBILITY } from '../lib/constants'
import type { AuditLogData } from '../lib/types'
import { AuditCard } from './audit-card'
import { createAuditColumns } from './audit-columns'
import { AuditDetailModal } from './audit-detail-modal'
import { AuditToolbar } from './audit-toolbar'

export function AuditTable() {
  const pagination = useCursorPagination(30)

  const [actionFilter, setActionFilter] = useState('')
  const [entityType, setEntityType] = useState<string | undefined>(undefined)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('ALL')
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [selectedEntry, setSelectedEntry] = useState<AuditLogData | null>(null)

  const { dateFrom, dateTo } = resolvePeriodRange(periodFilter)

  const { data, isLoading, isError, refetch } = useAuditLogs({
    action: actionFilter || undefined,
    entityType,
    dateFrom,
    dateTo,
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

  function handleActionFilterChange(value: string) {
    setActionFilter(value)
    pagination.reset()
  }

  function handleEntityTypeChange(value: string) {
    setEntityType(value === 'ALL' ? undefined : value)
    pagination.reset()
  }

  function handlePeriodFilterChange(value: string) {
    if (isPeriodFilter(value)) {
      setPeriodFilter(value)
      pagination.reset()
    }
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
      <FilterTabs
        options={PERIOD_FILTER_OPTIONS}
        value={periodFilter}
        onChange={handlePeriodFilterChange}
      />

      <AuditToolbar
        entityType={entityType}
        onEntityTypeChange={handleEntityTypeChange}
        actionFilter={actionFilter}
        onActionFilterChange={handleActionFilterChange}
        columnVisibility={columnVisibility}
        onColumnToggle={handleColumnToggle}
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
