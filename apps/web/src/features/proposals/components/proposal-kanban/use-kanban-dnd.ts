'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'

import { api, ApiError } from '@/lib/api-client'

import type { KanbanFilters } from '../../hooks/use-kanban-proposals'
import type { ProposalData, ProposalStage } from '../../lib/constants'
import {
  findProposalInCache,
  isNextStage,
  isProposalStage,
} from './kanban-utils'

const ADVANCE_TARGETS = new Set<ProposalStage>([
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
  'POLICY_ISSUED',
])

interface OptimisticMove {
  proposalId: string
  sourceStage: ProposalStage
  targetStage: ProposalStage
  proposal: ProposalData
}

interface UseKanbanDndParams {
  filters: KanbanFilters
  visibleStages: readonly ProposalStage[]
  onPolicyIssue: (proposalId: string) => void
  onLostDrop: (proposalId: string) => void
}

interface UseKanbanDndReturn {
  activeProposal: ProposalData | null
  optimisticMove: OptimisticMove | null
  handleDragStart: (event: DragStartEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
  buildOptimisticProposals: (stage: ProposalStage) => ProposalData[] | undefined
}

export function useKanbanDnd({
  filters,
  visibleStages,
  onPolicyIssue,
  onLostDrop,
}: UseKanbanDndParams): UseKanbanDndReturn {
  const [activeProposal, setActiveProposal] = useState<ProposalData | null>(
    null
  )
  const [optimisticMove, setOptimisticMove] = useState<OptimisticMove | null>(
    null
  )
  const queryClient = useQueryClient()
  const handleDragStart = (event: DragStartEvent) => {
    const result = findProposalInCache(
      queryClient,
      String(event.active.id),
      filters,
      visibleStages
    )
    setActiveProposal(result?.proposal ?? null)
  }
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) {
      setActiveProposal(null)
      return
    }
    const proposalId = String(active.id)
    const rawTarget = String(over.data?.current?.stage ?? over.id)
    if (!isProposalStage(rawTarget)) {
      setActiveProposal(null)
      return
    }
    const targetStage = rawTarget
    const found = findProposalInCache(
      queryClient,
      proposalId,
      filters,
      visibleStages
    )
    setActiveProposal(null)
    if (!found || found.stage === targetStage) return
    const { proposal, stage: sourceStage } = found
    if (sourceStage === 'POLICY_ISSUED') return
    if (targetStage === 'LOST') {
      onLostDrop(proposalId)
      return
    }
    if (!ADVANCE_TARGETS.has(targetStage)) return
    if (!isNextStage(sourceStage, targetStage, visibleStages)) return
    const movedProposal: ProposalData = { ...proposal, stage: targetStage }
    setOptimisticMove({
      proposalId,
      sourceStage,
      targetStage,
      proposal: movedProposal,
    })
    void api
      .post<ProposalData>(`/api/v1/proposals/${proposalId}/advance`, {})
      .then(() => {
        setOptimisticMove(null)
        void queryClient.invalidateQueries({
          queryKey: ['proposals', 'kanban'],
        })
        if (targetStage === 'POLICY_ISSUED') {
          onPolicyIssue(proposalId)
        }
      })
      .catch((error: unknown) => {
        setOptimisticMove(null)
        const message =
          error instanceof ApiError ? error.message : 'Erro ao mover proposta'
        toast.error(message)
      })
  }
  function buildOptimisticProposals(
    stage: ProposalStage
  ): ProposalData[] | undefined {
    if (!optimisticMove) return undefined
    const queryKey = ['proposals', 'kanban', stage, filters]
    const cached = queryClient.getQueryData<{
      pages: Array<{ data: ProposalData[] }>
    }>(queryKey)
    const fetched = cached?.pages.flatMap((p) => p.data) ?? []
    if (stage === optimisticMove.sourceStage) {
      return fetched.filter((p) => p.id !== optimisticMove.proposalId)
    }
    if (stage === optimisticMove.targetStage) {
      return [optimisticMove.proposal, ...fetched]
    }
    return undefined
  }
  return {
    activeProposal,
    optimisticMove,
    handleDragStart,
    handleDragEnd,
    buildOptimisticProposals,
  }
}
