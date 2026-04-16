'use client'

import { FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import { FilterTabs } from '@/components/shared/filter-tabs'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { TableToolbar } from '@/components/shared/table-toolbar'

import { useProposalsTable } from '../hooks/use-proposals-table'
import {
  ALL_FILTER_VALUE,
  BOARD_TYPES,
  BOARD_TYPE_FILTER_OPTIONS,
  HIDEABLE_COLUMNS,
  type BoardType,
} from '../lib/constants'
import { LostReasonDialog } from './lost-reason-dialog'
import { ProposalCard } from './proposal-card'
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
  'use no memo'
  const router = useRouter()
  const {
    table,
    proposals,
    isLoading,
    isError,
    refetch,
    pagination,
    nextCursor,
    knownTotal,
    search,
    setSearch,
    stageFilter,
    setStageFilter,
    boardTypeFilter,
    setBoardTypeFilter,
    columnVisibility,
    handleColumnToggle,
    columnActions,
    debouncedSearch,
    stageParam,
    boardTypeParam,
    lostDialogProposalId,
    setLostDialogProposalId,
  } = useProposalsTable(allowedBoardTypes)

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
          onChange={setBoardTypeFilter}
        />
      )}

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar propostas..."
        filters={
          <ProposalsStageFilter
            stageFilter={stageFilter}
            onStageFilterChange={setStageFilter}
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
            isAdvancing={columnActions.isAdvancing}
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
