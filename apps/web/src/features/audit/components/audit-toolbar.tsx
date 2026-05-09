'use client'

import type { VisibilityState } from '@tanstack/react-table'
import { Check, SlidersHorizontal } from 'lucide-react'

import { ToolbarFilterSelect } from '@/components/shared/toolbar-filter-select'
import { Button } from '@/components/ui/button'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'

import {
  ACTION_SELECT_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  HIDEABLE_COLUMNS,
} from '../lib/constants'

interface AuditToolbarProps {
  readonly entityType: string | undefined
  readonly onEntityTypeChange: (value: string) => void
  readonly actionFilter: string
  readonly onActionFilterChange: (value: string) => void
  readonly columnVisibility: VisibilityState
  readonly onColumnToggle: (id: string, visible: boolean) => void
}

export function AuditToolbar({
  entityType,
  onEntityTypeChange,
  actionFilter,
  onActionFilterChange,
  columnVisibility,
  onColumnToggle,
}: AuditToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarFilterSelect
          value={entityType ?? 'ALL'}
          onValueChange={onEntityTypeChange}
          allLabel="Todas entidades"
          allValue="ALL"
          options={ENTITY_TYPE_OPTIONS.filter((opt) => opt.value !== 'ALL')}
          widthClass="w-[170px]"
        />
        <ToolbarFilterSelect
          value={actionFilter}
          onValueChange={onActionFilterChange}
          allLabel="Todas ações"
          allValue=""
          options={ACTION_SELECT_OPTIONS.filter((opt) => opt.value !== '')}
          widthClass="w-[160px]"
        />
      </div>

      <Popover>
        <PopoverTrigger render={<Button variant="outline" />}>
          <SlidersHorizontal className="size-4" />
          Colunas
        </PopoverTrigger>
        <PopoverPopup side="bottom" align="end" className="min-w-[160px]">
          <p className="text-muted-foreground px-2 pb-1.5 text-xs font-medium">
            Alternar colunas
          </p>
          {HIDEABLE_COLUMNS.map((col) => {
            const isVisible = columnVisibility[col.id] !== false
            return (
              <button
                key={col.id}
                type="button"
                className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                onClick={() => onColumnToggle(col.id, !isVisible)}
              >
                <Check
                  className={`size-3.5 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                />
                {col.label}
              </button>
            )
          })}
        </PopoverPopup>
      </Popover>
    </div>
  )
}
