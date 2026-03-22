'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { useDebounce } from '@/hooks/use-debounce'

import { groupByStage, useKanbanProposals } from '../hooks/use-kanban-proposals'
import type { BoardType, ProposalData } from '../types'
import { STAGES } from '../types'
import { KanbanCardDetail } from './kanban-card-detail'
import { KanbanColumn } from './kanban-column'
import { KanbanSkeleton, KanbanToolbar } from './kanban-parts'

export function ProposalKanban() {
  const [boardType, setBoardType] = useState<BoardType>('NEW_INSURANCE')
  const [search, setSearch] = useState('')
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | null>(
    null
  )

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isError, refetch } = useKanbanProposals({
    boardType,
    search: debouncedSearch || undefined,
  })

  const grouped = groupByStage(data ?? [])

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
      <KanbanToolbar
        search={search}
        onSearchChange={setSearch}
        boardType={boardType}
        onBoardTypeChange={setBoardType}
      />

      {isLoading ? (
        <KanbanSkeleton />
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          style={{ minHeight: '60vh' }}
        >
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              proposals={grouped[stage] ?? []}
              onCardClick={setSelectedProposal}
            />
          ))}
        </div>
      )}

      <KanbanCardDetail
        proposal={selectedProposal}
        onClose={() => setSelectedProposal(null)}
      />
    </div>
  )
}
