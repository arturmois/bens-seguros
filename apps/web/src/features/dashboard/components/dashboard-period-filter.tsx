'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { DashboardPreset } from '../lib/constants'

const PRESETS: Array<{
  readonly value: DashboardPreset
  readonly label: string
}> = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '6m', label: '6 meses' },
]

interface DashboardPeriodFilterProps {
  readonly preset: DashboardPreset
  readonly onPresetChange: (preset: DashboardPreset) => void
}

export function DashboardPeriodFilter({
  preset,
  onPresetChange,
}: DashboardPeriodFilterProps) {
  return (
    <div className="flex gap-1">
      {PRESETS.map((p) => (
        <Button
          key={p.value}
          variant={preset === p.value ? 'default' : 'outline'}
          size="sm"
          className={cn('h-7 px-3 text-xs')}
          onClick={() => onPresetChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  )
}
