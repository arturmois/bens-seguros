'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { ALL_FILTER_VALUE } from '../lib/constants'

interface FilterOption {
  readonly value: string
  readonly label: string
}

interface ProposalsFilterSelectProps {
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly allLabel: string
  readonly options: readonly FilterOption[]
  readonly width: string
}

export function ProposalsFilterSelect({
  value,
  onValueChange,
  allLabel,
  options,
  width,
}: ProposalsFilterSelectProps) {
  const labelByValue = new Map(options.map((o) => [o.value, o.label]))

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v !== null) onValueChange(v)
      }}
      items={[{ value: ALL_FILTER_VALUE, label: allLabel }, ...options]}
    >
      <SelectTrigger className={`h-8 ${width}`}>
        <SelectValue>
          {(current: string) => {
            if (current === ALL_FILTER_VALUE) return allLabel
            return labelByValue.get(current) ?? null
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_FILTER_VALUE}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
