'use client'

import type { VisibilityState } from '@tanstack/react-table'
import { Check, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { ENTITY_TYPE_OPTIONS, HIDEABLE_COLUMNS } from '../lib/constants'

interface AuditToolbarProps {
  readonly entityType: string | undefined
  readonly onEntityTypeChange: (value: string | null) => void
  readonly columnVisibility: VisibilityState
  readonly onColumnToggle: (id: string, visible: boolean) => void
}

export function AuditToolbar({
  entityType,
  onEntityTypeChange,
  columnVisibility,
  onColumnToggle,
}: AuditToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Select
        aria-label="Filtrar por entidade"
        value={entityType ?? 'ALL'}
        onValueChange={onEntityTypeChange}
        items={[...ENTITY_TYPE_OPTIONS]}
      >
        <SelectTrigger size="sm" className="w-48">
          <SelectValue>
            {(value: string) => {
              const item = ENTITY_TYPE_OPTIONS.find((o) => o.value === value)
              return item?.label ?? null
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger render={<Button variant="outline" size="sm" />}>
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
