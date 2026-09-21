'use client'

import type { VisibilityState } from '@tanstack/react-table'
import { Check, Search, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'

interface TableToolbarProps {
  readonly search: string
  readonly onSearchChange: (value: string) => void
  readonly searchPlaceholder?: string
  readonly filters?: React.ReactNode
  readonly columnVisibility?: VisibilityState
  readonly onColumnVisibilityChange?: (id: string, visible: boolean) => void
  readonly hideableColumns?: readonly { id: string; label: string }[]
  readonly children?: React.ReactNode
}

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters,
  columnVisibility,
  onColumnVisibilityChange,
  hideableColumns,
  children,
}: TableToolbarProps) {
  const showColumnToggle =
    columnVisibility && onColumnVisibilityChange && hideableColumns?.length
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="h-8 w-full ps-9 md:w-[320px]"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {filters}
      </div>
      <div className="flex items-center gap-2">
        {showColumnToggle && (
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>
              <SlidersHorizontal className="size-4" />
              Colunas
            </PopoverTrigger>
            <PopoverPopup side="bottom" align="end" className="min-w-[160px]">
              <p className="px-2 pb-1.5 font-medium text-muted-foreground text-xs">
                Alternar colunas
              </p>
              {hideableColumns.map((col) => {
                const isVisible = columnVisibility[col.id] !== false
                return (
                  <button
                    key={col.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => onColumnVisibilityChange(col.id, !isVisible)}
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
        )}
        {children}
      </div>
    </div>
  )
}
