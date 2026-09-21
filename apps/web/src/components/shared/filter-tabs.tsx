'use client'

import { cn } from '@/lib/utils'

interface FilterTabsProps {
  readonly options: readonly { value: string; label: string }[]
  readonly value: string
  readonly onChange: (value: string) => void
}

export function FilterTabs({ options, value, onChange }: FilterTabsProps) {
  return (
    <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            'rounded-md px-3 py-1.5 font-medium text-xs transition-all',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
