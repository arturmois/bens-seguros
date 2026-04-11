'use client'

import type { SortingState, VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'

import { useAdvanceProposal, useProposals } from '../hooks/use-proposals'
import {
  ALL_FILTER_VALUE,
  BOARD_TYPES,
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
  type BoardType,
  type ProposalData,
} from '../lib/constants'
import { resolveBoardTypeParam, resolveStageParam } from '../lib/filter-helpers'
import { LostReasonDialog } from './lost-reason-dialog'
import { ProposalCard } from './proposal-card'
import { createProposalColumns } from './proposals-columns'
import { ProposalsToolbarActions } from './proposals-toolbar-actions'

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

  const { data, isLoading, isError, refetch } = useProposals({
    search: debouncedSearch || undefined,
    stage: stageParam,
    boardType: boardTypeParam,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
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
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <TableToolbar
        search={search}
        onSearchChange={withReset(setSearch)}
        searchPlaceholder="Buscar propostas..."
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        <ProposalsToolbarActions
          stageFilter={stageFilter}
          boardTypeFilter={boardTypeFilter}
          allowedBoardTypes={allowedBoardTypes}
          debouncedSearch={debouncedSearch}
          stageParam={stageParam}
          boardTypeParam={boardTypeParam}
          onStageFilterChange={withReset(setStageFilter)}
          onBoardTypeFilterChange={withReset(setBoardTypeFilter)}
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
