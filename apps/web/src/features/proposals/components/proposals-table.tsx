'use client'

import type { SortingState, VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import { FilterTabs } from '@/components/shared/filter-tabs'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import type { ListProposalsSortBy, ListProposalsSortOrder } from '@/api/model'

import { useAdvanceProposal, useProposals } from '../hooks/use-proposals'
import {
  ALL_FILTER_VALUE,
  BOARD_TYPES,
  BOARD_TYPE_FILTER_OPTIONS,
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
  type BoardType,
  type ProposalData,
} from '../lib/constants'
import { resolveBoardTypeParam, resolveStageParam } from '../lib/filter-helpers'
import { isProposalSortBy } from '../lib/type-guards'
import { LostReasonDialog } from './lost-reason-dialog'
import { ProposalCard } from './proposal-card'
import { createProposalColumns } from './proposals-columns'
import {
  ProposalsStageFilter,
  ProposalsToolbarActions,
} from './proposals-toolbar-actions'

interface ProposalsTableProps {
  readonly allowedBoardTypes?: readonly BoardType[]
}

export function ProposalsTable({
  allowedBoardTypes = BOARD_TYPES,
}: ProposalsTableProps) {
  const router = useRouter()
  const pagination = useCursorPagination()

  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>(ALL_FILTER_VALUE)
  const [boardTypeFilter, setBoardTypeFilter] = useState(ALL_FILTER_VALUE)
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [lostDialogProposalId, setLostDialogProposalId] = useState<
    string | null
  >(null)

  const debouncedSearch = useDebounce(search, 300)
  const { mutate: advanceMutate, isPending: isAdvancing } = useAdvanceProposal()

  const stageParam = resolveStageParam(stageFilter)
  const boardTypeParam = resolveBoardTypeParam(
    boardTypeFilter,
    allowedBoardTypes
  )

  const sortId = sorting[0]?.id
  const sortBy: ListProposalsSortBy | undefined =
    sortId !== undefined && isProposalSortBy(sortId) ? sortId : undefined
  const sortOrder: ListProposalsSortOrder | undefined =
    sorting[0] !== undefined ? (sorting[0].desc ? 'desc' : 'asc') : undefined

  const { data, isLoading, isError, refetch } = useProposals({
    search: debouncedSearch || undefined,
    stage: stageParam,
    boardType: boardTypeParam,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
    sortBy,
    sortOrder,
  })

  const proposals: ProposalData[] = useMemo(
    () => [...(data?.data ?? [])],
    [data?.data]
  )
  const nextCursor = data?.meta.nextCursor ?? null
  const knownTotal =
    (pagination.currentPage - 1) * pagination.pageSize + proposals.length

  const columnActions = useMemo(
    () => ({
      isAdvancing,
      onAdvance: (id: string) => advanceMutate(id),
      onLost: (id: string) => setLostDialogProposalId(id),
    }),
    [isAdvancing, advanceMutate]
  )

  const columns = useMemo(
    () => createProposalColumns(columnActions),
    [columnActions]
  )

  const table = useReactTable({
    data: proposals,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: (updater) => {
      setSorting(updater)
      pagination.reset()
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
  })

  function withReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      pagination.reset()
    }
  }

  function handleColumnToggle(id: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
  }

  if (isError) {
    return (
      <TableErrorState
        message="Erro ao carregar propostas."
        onRetry={refetch}
      />
    )
  }

  const boardTypeTabs = BOARD_TYPE_FILTER_OPTIONS.filter(
    (option) =>
      option.value === ALL_FILTER_VALUE ||
      (allowedBoardTypes as readonly string[]).includes(option.value)
  )
  const showBoardTypeTabs = allowedBoardTypes.length > 1

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {showBoardTypeTabs && (
        <FilterTabs
          options={boardTypeTabs}
          value={boardTypeFilter}
          onChange={withReset(setBoardTypeFilter)}
        />
      )}

      <TableToolbar
        search={search}
        onSearchChange={withReset(setSearch)}
        searchPlaceholder="Buscar propostas..."
        filters={
          <ProposalsStageFilter
            stageFilter={stageFilter}
            onStageFilterChange={withReset(setStageFilter)}
          />
        }
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <ProposalsToolbarActions
          debouncedSearch={debouncedSearch}
          stageParam={stageParam}
          boardTypeParam={boardTypeParam}
        />
      </TableToolbar>

      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={<FileText className="text-muted-foreground/50 size-10" />}
        emptyMessage="Nenhuma proposta encontrada"
        emptyDescription="Ajuste a busca ou os filtros, ou crie uma nova proposta."
        columnVisibility={columnVisibility}
        onRowClick={(proposal) => router.push(`/proposals/${proposal.id}`)}
      />

      <MobileCardList
        data={proposals}
        keyExtractor={(proposal) => proposal.id}
        isLoading={isLoading}
        emptyIcon={<FileText className="text-muted-foreground/50 size-10" />}
        emptyMessage="Nenhuma proposta encontrada"
        emptyDescription="Ajuste a busca ou os filtros, ou crie uma nova proposta."
        renderCard={(proposal) => (
          <ProposalCard
            proposal={proposal}
            isAdvancing={isAdvancing}
            onAdvance={columnActions.onAdvance}
            onLost={columnActions.onLost}
          />
        )}
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

      <LostReasonDialog
        proposalId={lostDialogProposalId}
        onClose={() => setLostDialogProposalId(null)}
      />
    </div>
  )
}
