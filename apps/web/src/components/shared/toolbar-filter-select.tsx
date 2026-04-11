'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FilterOption {
  readonly value: string
  readonly label: string
}

interface ToolbarFilterSelectProps {
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly allLabel: string
  readonly allValue: string
  readonly options: readonly FilterOption[]
  readonly widthClass?: string
}

/**
 * Compact select used inside `TableToolbar` children for secondary
 * dimensions that have more than 4 options (too many for FilterTabs).
 * Always prepends the "all" sentinel entry.
 */
export function ToolbarFilterSelect({
  value,
  onValueChange,
  allLabel,
  allValue,
  options,
  widthClass = 'w-[160px]',
}: ToolbarFilterSelectProps) {
  const labelByValue = new Map(options.map((o) => [o.value, o.label]))

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v !== null) onValueChange(v)
      }}
      items={[{ value: allValue, label: allLabel }, ...options]}
    >
      <SelectTrigger className={`h-8 ${widthClass}`}>
        <SelectValue>
          {(current: string) => {
            if (current === allValue) return allLabel
            return labelByValue.get(current) ?? null
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={allValue}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
