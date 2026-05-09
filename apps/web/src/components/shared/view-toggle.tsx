'use client'

import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ViewToggleOption<T extends string> {
  readonly value: T
  readonly label: string
  readonly icon: LucideIcon
}

interface ViewToggleProps<T extends string> {
  readonly value: T
  readonly onChange: (value: T) => void
  readonly options: readonly ViewToggleOption<T>[]
  readonly ariaLabel?: string
}

export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: ViewToggleProps<T>) {
  return (
    <div
      className="flex gap-1 rounded-md border p-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const Icon = opt.icon
        return (
          <Button
            key={opt.value}
            variant={value === opt.value ? 'default' : 'ghost'}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
          >
            <Icon className="mr-1.5 h-4 w-4" />
            {opt.label}
          </Button>
        )
      })}
    </div>
  )
}
