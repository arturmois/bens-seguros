'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { BooleanFilterControl } from './filter-controls/boolean-filter-control'
import { DateRangeFilterControl } from './filter-controls/date-range-filter-control'
import { EnumFilterControl } from './filter-controls/enum-filter-control'
import type {
  DateRangeValue,
  FilterDefinition,
  FilterValue,
} from './filter-types'

interface FilterPopoverProps {
  readonly filters: readonly FilterDefinition[]
  readonly values: Readonly<Record<string, FilterValue>>
  readonly editingKey: string | null
  readonly onEditingKeyChange: (key: string | null) => void
  readonly onChange: (key: string, value: FilterValue) => void
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

export function FilterPopover({
  filters,
  values,
  editingKey,
  onEditingKeyChange,
  onChange,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false)

  // When an external editingKey arrives (chip click), open directly to the control
  const isExternalEdit = editingKey !== null

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) onEditingKeyChange(null)
  }

  function handleSelectField(key: string) {
    onEditingKeyChange(key)
  }

  function handleClose() {
    setOpen(false)
    onEditingKeyChange(null)
  }

  const editingFilter = editingKey
    ? filters.find((f) => f.key === editingKey)
    : null

  return (
    <Popover open={open || isExternalEdit} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={<Button variant="outline" />}>
        <Plus className="size-3.5" />
        Filtro
      </PopoverTrigger>
      <PopoverPopup side="bottom" align="start" className="w-72 p-0">
        {!editingFilter && (
          <div className="flex w-full flex-col py-1">
            <div className="text-muted-foreground border-b px-3 py-1.5 text-xs font-medium">
              Filtros disponíveis
            </div>
            {filters
              .filter((filter) => !filter.hiddenInPopover)
              .map((filter) => {
                const Icon = filter.icon
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => handleSelectField(filter.key)}
                    className="hover:bg-accent flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
                  >
                    <Icon className="text-muted-foreground size-3.5" />
                    <span>{filter.label}</span>
                  </button>
                )
              })}
          </div>
        )}

        {editingFilter?.type === 'enum' && (
          <EnumFilterControlAdapter
            key={editingFilter.key}
            filter={editingFilter}
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
      </PopoverPopup>
    </Popover>
  )
}

interface EnumAdapterProps {
  readonly filter: Extract<FilterDefinition, { type: 'enum' }>
  readonly value: readonly string[] | undefined
  readonly onCommit: (next: readonly string[] | undefined) => void
  readonly onClose: () => void
}

function EnumFilterControlAdapter({
  filter,
  value,
  onCommit,
  onClose,
}: EnumAdapterProps) {
  const dynamic = filter.useOptions?.()
  const options = dynamic?.options ?? filter.options ?? []
  return (
    <EnumFilterControl
      label={filter.label}
      options={options}
      isLoadingOptions={dynamic?.isLoading ?? false}
      value={value}
      onCommit={onCommit}
      onClose={onClose}
    />
  )
}
