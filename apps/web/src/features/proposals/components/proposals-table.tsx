'use client'

import { FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { CursorPagination } from '@/components/shared/cursor-pagination'
import { DataTable } from '@/components/shared/data-table'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'

import { useProposalsTable } from '../hooks/use-proposals-table'
import { LostReasonDialog } from './lost-reason-dialog'
import { ProposalCard } from './proposal-card'

export function ProposalsTable() {
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
    columnVisibility,
    columnActions,
    lostDialogProposalId,
    setLostDialogProposalId,
  } = useProposalsTable()
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
