'use client'

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
  return (
    <ProposalExportButton
      filters={{
        search: debouncedSearch || undefined,
        stage: stageParam,
        boardType: boardTypeParam,
      }}
    />
  )
}
