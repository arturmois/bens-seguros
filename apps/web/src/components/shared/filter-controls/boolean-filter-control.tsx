'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BooleanFilterControlProps {
  readonly label: string
  readonly value: boolean | undefined
  readonly onCommit: (next: boolean | undefined) => void
  readonly onClose: () => void
}

const OPTIONS: readonly { value: boolean | undefined; label: string }[] = [
  { value: true, label: 'Sim' },
  { value: false, label: 'Não' },
  { value: undefined, label: 'Qualquer' },
]

export function BooleanFilterControl({
  label,
  value,
  onCommit,
  onClose,
}: BooleanFilterControlProps) {
  function handleSelect(next: boolean | undefined) {
    onCommit(next)
    onClose()
  }

  return (
    <div className="flex w-full flex-col" data-slot="boolean-filter-control">
      <div className="border-b px-3 py-2">
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="py-1">
        {OPTIONS.map((option) => {
          const active = option.value === value
          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-1.5 text-left text-sm',
                'hover:bg-accent'
              )}
            >
              <span>{option.label}</span>
              {active && <Check className="text-primary size-3.5" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
