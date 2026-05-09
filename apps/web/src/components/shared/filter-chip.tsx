'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterChipProps {
  readonly label: string
  readonly value: string
  readonly onClick?: () => void
  readonly onRemove: () => void
}

export function FilterChip({
  label,
  value,
  onClick,
  onRemove,
}: FilterChipProps) {
  return (
    <span
      className={cn(
        'border-input bg-accent inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
        'hover:bg-accent/80'
      )}
      data-slot="filter-chip"
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-1.5"
          aria-label={`Editar filtro ${label}`}
        >
          <span className="text-muted-foreground">{label}:</span>
          <span className="font-medium">{value}</span>
        </button>
      ) : (
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{label}:</span>
          <span className="font-medium">{value}</span>
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="size-3" />
      </button>
    </span>
  )
}
