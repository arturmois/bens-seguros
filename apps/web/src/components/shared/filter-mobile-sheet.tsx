'use client'

import { Filter, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { BooleanFilterControl } from './filter-controls/boolean-filter-control'
import { DateRangeFilterControl } from './filter-controls/date-range-filter-control'
import { EnumFilterControl } from './filter-controls/enum-filter-control'
import type {
  DateRangeValue,
  FilterDefinition,
  FilterValue,
} from './filter-types'

interface FilterMobileSheetProps {
  readonly filters: readonly FilterDefinition[]
  readonly values: Readonly<Record<string, FilterValue>>
  readonly activeCount: number
  readonly onChange: (key: string, value: FilterValue) => void
  readonly onClearAll: () => void
}

function asEnumValue(v: FilterValue): readonly string[] | undefined {
  return Array.isArray(v) ? v : undefined
}

function asDateRangeValue(v: FilterValue): DateRangeValue | undefined {
  return typeof v === 'object' && v !== null && 'preset' in v ? v : undefined
}

function asBooleanValue(v: FilterValue): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
}

export function FilterMobileSheet({
  filters,
  values,
  activeCount,
  onChange,
  onClearAll,
}: FilterMobileSheetProps) {
  const [open, setOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const editingFilter = editingKey
    ? filters.find((f) => f.key === editingKey)
    : null
  function handleClose() {
    setEditingKey(null)
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <Filter className="size-3.5" />
        {activeCount > 0 && (
          <span className="bg-primary text-primary-foreground ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
            {activeCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>
            {editingFilter ? editingFilter.label : 'Filtros'}
          </SheetTitle>
        </SheetHeader>
        {!editingFilter && (
          <div className="space-y-1">
            {filters
              .filter((filter) => !filter.hiddenInPopover)
              .map((filter) => {
                const v = values[filter.key]
                const hasValue =
                  v !== undefined && !(Array.isArray(v) && v.length === 0)
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setEditingKey(filter.key)}
                    className="hover:bg-accent flex w-full items-center justify-between rounded-md px-3 py-2 text-left"
                  >
                    <span className="text-sm">{filter.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {hasValue ? 'Definido' : '—'}
                    </span>
                  </button>
                )
              })}
            <div className="flex items-center justify-between border-t pt-3">
              <button
                type="button"
                onClick={() =>
                  setEditingKey(
                    filters.find((f) => !f.hiddenInPopover)?.key ?? null
                  )
                }
                className="text-primary inline-flex items-center gap-1 text-sm"
              >
                <Plus className="size-3.5" /> Adicionar filtro
              </button>
              <button
                type="button"
                onClick={onClearAll}
                disabled={activeCount === 0}
                className="text-muted-foreground hover:text-foreground text-sm disabled:opacity-50"
              >
                Limpar
              </button>
            </div>
          </div>
        )}
        {editingFilter?.type === 'enum' && (
          <EnumFilterControl
            key={editingFilter.key}
            label={editingFilter.label}
            options={editingFilter.options ?? []}
            value={asEnumValue(values[editingFilter.key])}
            onCommit={(next) => onChange(editingFilter.key, next)}
            onClose={handleClose}
          />
        )}
        {editingFilter?.type === 'dateRange' && (
          <DateRangeFilterControl
            key={editingFilter.key}
            label={editingFilter.label}
            value={asDateRangeValue(values[editingFilter.key])}
            onCommit={(next) => onChange(editingFilter.key, next)}
            onClose={handleClose}
          />
        )}
        {editingFilter?.type === 'boolean' && (
          <BooleanFilterControl
            key={editingFilter.key}
            label={editingFilter.label}
            value={asBooleanValue(values[editingFilter.key])}
            onCommit={(next) => onChange(editingFilter.key, next)}
            onClose={handleClose}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
