'use client'

import type { VisibilityState } from '@tanstack/react-table'
import { Check, Search, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'

import type { ClientFilters } from '../lib/types'
import { ClientExportButton } from './client-export-button'
import { ClientImportButton } from './client-import-button'

interface ClientsToolbarProps {
  readonly search: string
  readonly onSearchChange: (value: string) => void
  readonly currentFilters: ClientFilters
  readonly columnVisibility: VisibilityState
  readonly onColumnVisibilityChange: (id: string, visible: boolean) => void
  readonly hideableColumns: readonly { id: string; label: string }[]
}

export function ClientsToolbar({
  search,
  onSearchChange,
  currentFilters,
  columnVisibility,
  onColumnVisibilityChange,
  hideableColumns,
}: ClientsToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar clientes..."
          className="h-8 w-full ps-9 md:w-[320px]"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar clientes"
        />
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger render={<Button variant="outline" size="sm" />}>
            <SlidersHorizontal className="size-4" />
            Colunas
          </PopoverTrigger>
          <PopoverPopup side="bottom" align="end" className="min-w-[160px]">
            <p className="text-muted-foreground px-2 pb-1.5 text-xs font-medium">
              Alternar colunas
            </p>
            {hideableColumns.map((col) => {
              const isVisible = columnVisibility[col.id] !== false
              return (
                <button
                  key={col.id}
                  type="button"
                  className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
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

        <ClientImportButton />
        <ClientExportButton filters={currentFilters} />
      </div>
    </div>
  )
}
