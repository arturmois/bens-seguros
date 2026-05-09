'use client'

import { Check, Search, SlidersHorizontal } from 'lucide-react'
import type { VisibilityState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { FilterChipsBar } from './filter-chips-bar'
import { FilterMobileSheet } from './filter-mobile-sheet'
import { FilterPopover } from './filter-popover'
import type { FilterDefinition, FilterValue } from './filter-types'

interface UnifiedFilterBarProps {
  readonly searchPlaceholder?: string
  readonly searchValue?: string
  readonly onSearchChange?: (value: string) => void
  readonly hideSearch?: boolean
  readonly filters: readonly FilterDefinition[]
  readonly values: Readonly<Record<string, FilterValue>>
  readonly onFilterChange: (key: string, value: FilterValue) => void
  readonly onClearAll: () => void
  readonly columnVisibility?: VisibilityState
  readonly onColumnVisibilityChange?: (id: string, visible: boolean) => void
  readonly hideableColumns?: readonly { id: string; label: string }[]
  readonly children?: React.ReactNode
}

export function UnifiedFilterBar({
  searchPlaceholder = 'Buscar...',
  searchValue = '',
  onSearchChange,
  hideSearch = false,
  filters,
  values,
  onFilterChange,
  onClearAll,
  columnVisibility,
  onColumnVisibilityChange,
  hideableColumns,
  children,
}: UnifiedFilterBarProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const activeCount = useMemo(
    () =>
      filters.reduce((acc, f) => {
        const v = values[f.key]
        if (v === undefined) return acc
        if (Array.isArray(v) && v.length === 0) return acc
        return acc + 1
      }, 0),
    [filters, values]
  )

  const showColumnToggle =
    columnVisibility && onColumnVisibilityChange && hideableColumns?.length

  return (
    <div className="flex flex-col gap-2" data-slot="unified-filter-bar">
      <div className="flex flex-wrap items-center gap-2">
        {!hideSearch && (
          <InputGroup className="flex-1 md:max-w-[320px] [&_input]:h-8 [&_input]:leading-8">
            <InputGroupAddon>
              <Search className="text-muted-foreground size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </InputGroup>
        )}

        {isDesktop ? (
          <FilterPopover
            filters={filters}
            values={values}
            editingKey={editingKey}
            onEditingKeyChange={setEditingKey}
            onChange={onFilterChange}
          />
        ) : (
          <FilterMobileSheet
            filters={filters}
            values={values}
            activeCount={activeCount}
            onChange={onFilterChange}
            onClearAll={onClearAll}
          />
        )}

        <div className="ms-auto flex items-center gap-2">
          {showColumnToggle && (
            <Popover>
              <PopoverTrigger render={<Button variant="outline" />}>
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
                      onClick={() =>
                        onColumnVisibilityChange(col.id, !isVisible)
                      }
                      className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
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

      {isDesktop && (
        <FilterChipsBar
          filters={filters}
          values={values}
          onEdit={(key) => setEditingKey(key)}
          onRemove={(key) => onFilterChange(key, undefined)}
          onClearAll={onClearAll}
        />
      )}
    </div>
  )
}
