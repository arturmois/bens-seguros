'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

import { STAGES, STAGE_LABELS } from '../lib/constants'
import type { BoardType, ProposalStage } from '../lib/constants'
import { ProposalExportButton } from './proposal-export-button'
import { ProposalsFilterSelect } from './proposals-filter-select'

const STAGE_OPTIONS = STAGES.map((s) => ({
  value: s,
  label: STAGE_LABELS[s],
}))

interface ProposalsStageFilterProps {
  readonly stageFilter: string
  readonly onStageFilterChange: (value: string) => void
}

export function ProposalsStageFilter({
  stageFilter,
  onStageFilterChange,
}: ProposalsStageFilterProps) {
  return (
    <ProposalsFilterSelect
      value={stageFilter}
      onValueChange={onStageFilterChange}
      allLabel="Todos estágios"
      options={STAGE_OPTIONS}
      width="w-[160px]"
    />
  )
}

interface ProposalsToolbarActionsProps {
  readonly debouncedSearch: string
  readonly stageParam: ProposalStage | undefined
  readonly boardTypeParam: BoardType | undefined
}

export function ProposalsToolbarActions({
  debouncedSearch,
  stageParam,
  boardTypeParam,
}: ProposalsToolbarActionsProps) {
  const router = useRouter()

  return (
    <>
      <ProposalExportButton
        filters={{
          search: debouncedSearch || undefined,
          stage: stageParam,
          boardType: boardTypeParam,
        }}
      />

      <Button onClick={() => router.push('/proposals/new')}>
        <Plus className="size-4 sm:mr-2" />
        <span className="hidden sm:inline">Nova proposta</span>
      </Button>
    </>
  )
}
