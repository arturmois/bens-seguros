'use client'

import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { BoardType, ProposalStage } from '../lib/constants'
import { BOARD_TYPE_LABELS, STAGE_LABELS, STAGES } from '../lib/constants'
import { ProposalExportButton } from './proposal-export-button'

const ALL_VALUE = '__all__'

interface ProposalsTableToolbarProps {
  readonly search: string
  readonly stageFilter: string
  readonly boardTypeFilter: string
  readonly debouncedSearch: string
  readonly allowedBoardTypes: readonly BoardType[]
  readonly onSearchChange: (value: string) => void
  readonly onStageFilterChange: (value: string) => void
  readonly onBoardTypeFilterChange: (value: string) => void
}

export function ProposalsTableToolbar({
  search,
  stageFilter,
  boardTypeFilter,
  debouncedSearch,
  allowedBoardTypes,
  onSearchChange,
  onStageFilterChange,
  onBoardTypeFilterChange,
}: ProposalsTableToolbarProps) {
  const router = useRouter()

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          aria-label="Buscar propostas por cliente"
          placeholder="Buscar propostas..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={stageFilter}
        onValueChange={(v) => {
          if (v !== null) onStageFilterChange(v)
        }}
        items={[
          { value: ALL_VALUE, label: 'Todos' },
          ...STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] })),
        ]}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue>
            {(value: string) => {
              if (value === ALL_VALUE) return 'Todos'
              return STAGE_LABELS[value as ProposalStage] ?? null
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Todos</SelectItem>
          {STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {STAGE_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={boardTypeFilter}
        onValueChange={(v) => {
          if (v !== null) onBoardTypeFilterChange(v)
        }}
        items={[
          { value: ALL_VALUE, label: 'Todos' },
          ...allowedBoardTypes.map((bt) => ({
            value: bt,
            label: BOARD_TYPE_LABELS[bt],
          })),
        ]}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue>
            {(value: string) => {
              if (value === ALL_VALUE) return 'Todos'
              return BOARD_TYPE_LABELS[value as BoardType] ?? null
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Todos</SelectItem>
          {allowedBoardTypes.map((bt) => (
            <SelectItem key={bt} value={bt}>
              {BOARD_TYPE_LABELS[bt]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ProposalExportButton
        filters={{
          search: debouncedSearch || undefined,
          stage:
            stageFilter !== ALL_VALUE
              ? (stageFilter as ProposalStage)
              : undefined,
          boardType:
            boardTypeFilter !== ALL_VALUE
              ? (boardTypeFilter as BoardType)
              : undefined,
        }}
      />
      <Button onClick={() => router.push('/proposals/new')}>
        <Plus className="mr-2 h-4 w-4" />
        Nova Proposta
      </Button>
    </div>
  )
}
