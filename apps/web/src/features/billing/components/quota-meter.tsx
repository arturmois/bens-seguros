'use client'

import { Infinity as InfinityIcon } from 'lucide-react'

import { Meter, MeterIndicator, MeterTrack } from '@/components/ui/meter'
import { cn } from '@/lib/utils'

interface QuotaMeterProps {
  readonly label: string
  readonly value: number
  /** null → ilimitado (sem renderizar a meter, apenas o badge) */
  readonly limit: number | null
  readonly unit?: string
}

const WARNING_THRESHOLD = 0.8
const LIMIT_THRESHOLD = 1

export function QuotaMeter({ label, value, limit, unit }: QuotaMeterProps) {
  if (limit === null) {
    return (
      <div className="space-y-1">
        <span className="text-foreground text-sm font-medium">{label}</span>
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <InfinityIcon className="size-4" />
          <span>Ilimitado</span>
        </div>
      </div>
    )
  }

  const ratio = limit > 0 ? value / limit : 0
  const indicatorClass = cn(
    ratio >= LIMIT_THRESHOLD && 'bg-destructive',
    ratio >= WARNING_THRESHOLD && ratio < LIMIT_THRESHOLD && 'bg-warning'
  )
  const unitSuffix = unit ? ` ${unit}` : ''
  const valueText = `${value} / ${limit}${unitSuffix}`

  return (
    <Meter value={value} min={0} max={limit}>
      <div className="flex items-center justify-between">
        <span className="text-foreground text-sm font-medium">{label}</span>
        <span
          className="text-foreground text-sm tabular-nums"
          data-slot="quota-meter-value"
        >
          {valueText}
        </span>
      </div>
      <MeterTrack>
        <MeterIndicator className={indicatorClass} />
      </MeterTrack>
    </Meter>
  )
}
