'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { ptBR } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  readonly value?: Date
  readonly onChange: (date: Date | undefined) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly className?: string
}

function formatDatePtBR(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'UTC',
  }).format(date)
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione uma data',
  disabled,
  className,
}: DatePickerProps): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'border-input bg-background shadow-xs focus-visible:ring-ring/24 focus-visible:border-ring inline-flex h-9 w-full items-center justify-start gap-2 rounded-lg border px-3 py-1 text-left text-base font-normal transition-colors focus-visible:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
          !value && 'text-muted-foreground',
          className
        )}
      >
        <CalendarIcon className="size-4 shrink-0" />
        <span>{value ? formatDatePtBR(value) : placeholder}</span>
      </button>
      {open && (
        <div className="bg-popover absolute left-0 top-full z-50 mt-1 rounded-xl border p-2 shadow-lg">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            startMonth={new Date(1920, 0)}
            endMonth={new Date(new Date().getFullYear(), 11)}
            selected={value}
            onSelect={(date) => {
              if (date) {
                onChange(date)
                setOpen(false)
              }
            }}
            locale={ptBR}
            defaultMonth={value}
          />
        </div>
      )}
    </div>
  )
}
