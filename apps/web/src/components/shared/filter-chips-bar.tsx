'use client'

import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo } from 'react'

import { FilterChip } from './filter-chip'
import { findPreset } from './filter-presets'
import type {
  DateRangeValue,
  FilterDefinition,
  FilterDefinitionEnum,
  FilterOption,
  FilterValue,
} from './filter-types'

interface FilterChipsBarProps {
  readonly filters: readonly FilterDefinition[]
  readonly values: Readonly<Record<string, FilterValue>>
  readonly onEdit: (key: string) => void
  readonly onRemove: (key: string) => void
  readonly onClearAll: () => void
}

const MAX_VALUES_DISPLAYED = 3

function buildLabelMap(
  options: readonly FilterOption[]
): Readonly<Record<string, string>> {
  return Object.fromEntries(options.map((o) => [o.value, o.label]))
}

function formatEnumDisplay(
  values: readonly string[],
  labels: Readonly<Record<string, string>>
): string {
  const displayed = values
    .slice(0, MAX_VALUES_DISPLAYED)
    .map((v) => labels[v] ?? v)
  const remaining = values.length - MAX_VALUES_DISPLAYED
  return remaining > 0
    ? `${displayed.join(', ')} +${remaining}`
    : displayed.join(', ')
}

function formatDateRangeDisplay(value: DateRangeValue): string {
  const preset = findPreset(value.preset)
  if (preset) return preset.label
  if (value.from && value.to) {
    return `${format(parseISO(value.from), 'dd/MM/yy', { locale: ptBR })} → ${format(
      parseISO(value.to),
      'dd/MM/yy',
      { locale: ptBR }
    )}`
  }
  return '—'
}

function formatBooleanDisplay(value: boolean): string {
  return value ? 'Sim' : 'Não'
}

function isDateRangeValue(v: FilterValue): v is DateRangeValue {
  return typeof v === 'object' && v !== null && 'preset' in v
}

function getActiveFilters(
  filters: readonly FilterDefinition[],
  values: Readonly<Record<string, FilterValue>>
) {
  return filters.flatMap((filter) => {
    const v = values[filter.key]
    if (v === undefined || (Array.isArray(v) && v.length === 0)) return []
    return [{ filter, value: v }]
  })
}

interface ChipProps {
  readonly filter: FilterDefinition
  readonly value: FilterValue
  readonly onEdit: () => void
  readonly onRemove: () => void
}

function StaticChip({ filter, value, onEdit, onRemove }: ChipProps) {
  const labels =
    filter.type === 'enum' ? buildLabelMap(filter.options ?? []) : {}
  let display = '—'
  if (filter.type === 'enum' && Array.isArray(value)) {
    display = formatEnumDisplay(value, labels)
  } else if (filter.type === 'dateRange' && isDateRangeValue(value)) {
    display = formatDateRangeDisplay(value)
  } else if (filter.type === 'boolean' && typeof value === 'boolean') {
    display = formatBooleanDisplay(value)
  }
  return (
    <FilterChip
      label={filter.label}
      value={display}
      onClick={filter.hiddenInPopover ? undefined : onEdit}
      onRemove={onRemove}
    />
  )
}

interface DynamicEnumChipProps {
  readonly filter: FilterDefinitionEnum & {
    readonly useOptions: NonNullable<FilterDefinitionEnum['useOptions']>
  }
  readonly value: FilterValue
  readonly onEdit: () => void
  readonly onRemove: () => void
}

function DynamicEnumChip({
  filter,
  value,
  onEdit,
  onRemove,
}: DynamicEnumChipProps) {
  const dynamic = filter.useOptions()
  const labels = useMemo(
    () => buildLabelMap(dynamic.options),
    [dynamic.options]
  )
  const display = Array.isArray(value) ? formatEnumDisplay(value, labels) : '—'
  return (
    <FilterChip
      label={filter.label}
      value={display}
      onClick={filter.hiddenInPopover ? undefined : onEdit}
      onRemove={onRemove}
    />
  )
}

function isDynamicEnum(
  filter: FilterDefinition
): filter is FilterDefinitionEnum & {
  readonly useOptions: NonNullable<FilterDefinitionEnum['useOptions']>
} {
  return filter.type === 'enum' && filter.useOptions !== undefined
}

export function FilterChipsBar({
  filters,
  values,
  onEdit,
  onRemove,
  onClearAll,
}: FilterChipsBarProps) {
  const active = getActiveFilters(filters, values)
  if (active.length === 0) return null
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      data-slot="filter-chips-bar"
    >
      {active.map(({ filter, value }) => {
        const handleEdit = () => onEdit(filter.key)
        const handleRemove = () => onRemove(filter.key)
        if (isDynamicEnum(filter)) {
          return (
            <DynamicEnumChip
              key={filter.key}
              filter={filter}
              value={value}
              onEdit={handleEdit}
              onRemove={handleRemove}
            />
          )
        }
        return (
          <StaticChip
            key={filter.key}
            filter={filter}
            value={value}
            onEdit={handleEdit}
            onRemove={handleRemove}
          />
        )
      })}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 text-muted-foreground text-xs hover:text-foreground"
      >
        Limpar todos
      </button>
    </div>
  )
}
