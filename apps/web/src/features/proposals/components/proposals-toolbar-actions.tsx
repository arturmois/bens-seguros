'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

import {
  STAGES,
  STAGE_LABELS,
  type BoardType,
  type ProposalStage,
} from '../lib/constants'
import { ProposalExportButton } from './proposal-export-button'
import { ProposalsFilterSelect } from './proposals-filter-select'

interface ProposalsToolbarActionsProps {
  readonly stageFilter: string
  readonly debouncedSearch: string
  readonly stageParam: ProposalStage | undefined
  readonly boardTypeParam: BoardType | undefined
  readonly onStageFilterChange: (value: string) => void
}

const STAGE_OPTIONS = STAGES.map((s) => ({
  value: s,
  label: STAGE_LABELS[s],
}))

export function ProposalsToolbarActions({
  stageFilter,
  debouncedSearch,
  stageParam,
  boardTypeParam,
  onStageFilterChange,
}: ProposalsToolbarActionsProps) {
  const router = useRouter()

  return (
    <>
      <ProposalsFilterSelect
        value={stageFilter}
        onValueChange={onStageFilterChange}
        allLabel="Todos estágios"
        options={STAGE_OPTIONS}
        width="w-[160px]"
      />

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
