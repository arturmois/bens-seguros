'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { getAvailableYears } from '../lib/constants'

interface GoalsYearSelectorProps {
  readonly year: number
  readonly onYearChange: (year: number) => void
}

export function GoalsYearSelector({
  year,
  onYearChange,
}: GoalsYearSelectorProps) {
  return (
    <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
      <SelectTrigger className="w-32" aria-label="Selecionar ano">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {getAvailableYears().map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
