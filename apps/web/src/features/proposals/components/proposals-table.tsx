'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDebounce } from '@/hooks/use-debounce'

import { useAdvanceProposal, useProposals } from '../hooks/use-proposals'
import type { BoardType, ProposalData, ProposalStage } from '../lib/constants'
import { BOARD_TYPES } from '../lib/constants'
import { LostReasonDialog } from './lost-reason-dialog'
import { ProposalTableRow } from './proposal-table-row'
import { ProposalsPagination } from './proposals-pagination'
import {
  ProposalsEmptyState,
  ProposalsTableSkeleton,
} from './proposals-table-parts'
import { ProposalsTableToolbar } from './proposals-table-toolbar'

const ALL_VALUE = '__all__'

interface ProposalsTableProps {
  allowedBoardTypes?: readonly BoardType[]
}

export function ProposalsTable({
  allowedBoardTypes = BOARD_TYPES,
}: ProposalsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>(ALL_VALUE)
  const [boardTypeFilter, setBoardTypeFilter] = useState<string>(ALL_VALUE)
  const [cursors, setCursors] = useState<string[]>([])
  const [lostDialogProposalId, setLostDialogProposalId] = useState<
    string | null
  >(null)

  const debouncedSearch = useDebounce(search, 300)
  const currentCursor = cursors.at(-1)

  const boardType =
    boardTypeFilter !== ALL_VALUE
      ? (boardTypeFilter as BoardType)
      : allowedBoardTypes.length === 1
        ? allowedBoardTypes[0]
        : undefined

  const filters = {
    search: debouncedSearch || undefined,
    stage:
      stageFilter !== ALL_VALUE ? (stageFilter as ProposalStage) : undefined,
    boardType,
    cursor: currentCursor,
    limit: 20,
  }

  const { data, isLoading, isError, refetch } = useProposals(filters)
  const advanceMutation = useAdvanceProposal()

  const handleRowClick = useCallback(
    (id: string) => {
      router.push(`/proposals/${id}`)
    },
    [router]
  )

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCursors([])
  }

  const handleStageFilterChange = (value: string) => {
    setStageFilter(value)
    setCursors([])
  }

  const handleBoardTypeFilterChange = (value: string) => {
    setBoardTypeFilter(value)
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

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-destructive text-sm">Erro ao carregar propostas.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ProposalsTableToolbar
        search={search}
        stageFilter={stageFilter}
        boardTypeFilter={boardTypeFilter}
        debouncedSearch={debouncedSearch}
        allowedBoardTypes={allowedBoardTypes}
        onSearchChange={handleSearchChange}
        onStageFilterChange={handleStageFilterChange}
        onBoardTypeFilterChange={handleBoardTypeFilterChange}
      />

      {isLoading ? (
        <ProposalsTableSkeleton />
      ) : (
        <>
          {!data?.data.length ? (
            <ProposalsEmptyState />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Ramo</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="hidden text-right md:table-cell">
                      Valor
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Criado em
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((proposal: ProposalData) => (
                    <ProposalTableRow
                      key={proposal.id}
                      proposal={proposal}
                      isAdvancing={advanceMutation.isPending}
                      onRowClick={handleRowClick}
                      onAdvance={(id) => advanceMutation.mutate(id)}
                      onLost={setLostDialogProposalId}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <ProposalsPagination
            hasNextPage={Boolean(data?.meta.nextCursor)}
            hasPreviousPage={cursors.length > 0}
            onNext={handleNextPage}
            onPrevious={handlePreviousPage}
          />
        </>
      )}

      <LostReasonDialog
        proposalId={lostDialogProposalId}
        onClose={() => setLostDialogProposalId(null)}
      />
    </div>
  )
}
