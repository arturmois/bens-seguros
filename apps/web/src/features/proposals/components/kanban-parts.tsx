'use client'

import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

import type { BoardType } from '../lib/constants'
import { BOARD_TYPE_LABELS, STAGES } from '../lib/constants'

interface KanbanToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  boardType: BoardType
  onBoardTypeChange: (value: BoardType) => void
  allowedBoardTypes: readonly BoardType[]
  searchPlaceholder?: string
}

export function KanbanToolbar({
  search,
  onSearchChange,
  boardType,
  onBoardTypeChange,
  allowedBoardTypes,
  searchPlaceholder = 'Buscar propostas...',
}: KanbanToolbarProps) {
  const showBoardToggle = allowedBoardTypes.length > 1

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          aria-label="Buscar propostas"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      {showBoardToggle && (
        <div className="flex gap-1 rounded-md border p-0.5">
          {allowedBoardTypes.map((bt) => (
            <Button
              key={bt}
              variant={boardType === bt ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onBoardTypeChange(bt)}
            >
              {BOARD_TYPE_LABELS[bt]}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((stage) => (
        <div
          key={stage}
          className="bg-muted/30 flex w-[280px] shrink-0 flex-col rounded-xl border"
        >
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-2 p-2">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
