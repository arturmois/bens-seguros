'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

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
import type { BoardType, ProposalData, ProposalStage } from '../types'
import { LostReasonDialog } from './lost-reason-dialog'
import { ProposalTableRow } from './proposal-table-row'
import {
  ProposalsEmptyState,
  ProposalsTableSkeleton,
} from './proposals-table-parts'
import { ProposalsTableToolbar } from './proposals-table-toolbar'

const ALL_VALUE = '__all__'

export function ProposalsTable() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>(ALL_VALUE)
  const [boardTypeFilter, setBoardTypeFilter] = useState<string>(ALL_VALUE)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [lostDialogProposalId, setLostDialogProposalId] = useState<
    string | null
  >(null)

  const debouncedSearch = useDebounce(search, 300)

  const filters = {
    search: debouncedSearch || undefined,
    stage:
      stageFilter !== ALL_VALUE ? (stageFilter as ProposalStage) : undefined,
    boardType:
      boardTypeFilter !== ALL_VALUE
        ? (boardTypeFilter as BoardType)
        : undefined,
    cursor,
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
    setCursor(undefined)
  }

  const handleStageFilterChange = (value: string) => {
    setStageFilter(value)
    setCursor(undefined)
  }

  const handleBoardTypeFilterChange = (value: string) => {
    setBoardTypeFilter(value)
    setCursor(undefined)
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
          {data?.meta.hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setCursor(data.meta.nextCursor ?? undefined)}
              >
                Carregar mais
              </Button>
            </div>
          )}
        </>
      )}

      <LostReasonDialog
        proposalId={lostDialogProposalId}
        onClose={() => setLostDialogProposalId(null)}
      />
    </div>
  )
}
