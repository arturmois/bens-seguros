'use client'

import type { VisibilityState } from '@tanstack/react-table'
import { Check, Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import type { ClientFilters } from '../lib/constants'
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
  const [columnsOpen, setColumnsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!columnsOpen) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setColumnsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [columnsOpen])

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
        <div ref={ref} className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setColumnsOpen((prev) => !prev)}
          >
            <SlidersHorizontal className="size-4" />
            Colunas
          </Button>
          {columnsOpen && (
            <div className="bg-popover absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border p-1 shadow-lg">
              <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
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
            </div>
          )}
        </div>

        <ClientImportButton />
        <ClientExportButton filters={currentFilters} />
      </div>
    </div>
  )
}
