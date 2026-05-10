'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Check } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { CUSTOM_PRESET, DATE_RANGE_PRESETS } from '../filter-presets'
import type { DateRangeValue } from '../filter-types'

interface DateRangeFilterControlProps {
  readonly label: string
  readonly value: DateRangeValue | undefined
  readonly onCommit: (next: DateRangeValue | undefined) => void
  readonly onClose: () => void
}

type Stage = 'presets' | 'custom'

export function DateRangeFilterControl({
  label,
  value,
  onCommit,
  onClose,
}: DateRangeFilterControlProps) {
  const initialStage: Stage =
    value?.preset === CUSTOM_PRESET ? 'custom' : 'presets'
  const [stage, setStage] = useState<Stage>(initialStage)
  const [from, setFrom] = useState<Date | undefined>(
    value?.from ? parseISO(value.from) : undefined
  )
  const [to, setTo] = useState<Date | undefined>(
    value?.to ? parseISO(value.to) : undefined
  )
  function handlePreset(presetValue: string) {
    onCommit({ preset: presetValue })
    onClose()
  }
  function handleClear() {
    onCommit(undefined)
    onClose()
  }
  function handleCustomApply() {
    if (!from || !to) return
    onCommit({
      preset: CUSTOM_PRESET,
      from: format(from, 'yyyy-MM-dd'),
      to: format(to, 'yyyy-MM-dd'),
    })
    onClose()
  }
  if (stage === 'presets') {
    return (
      <div
        className="flex w-full flex-col"
        data-slot="date-range-filter-control"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{label}</span>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Limpar
          </button>
        </div>
        <div className="py-1">
          {DATE_RANGE_PRESETS.map((preset) => {
            const active = value?.preset === preset.value
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePreset(preset.value)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-1.5 text-left text-sm',
                  'hover:bg-accent'
                )}
              >
                <span>{preset.label}</span>
                {active && <Check className="text-primary size-3.5" />}
              </button>
            )
          })}
        </div>
        <div className="border-t py-1">
          <button
            type="button"
            onClick={() => setStage('custom')}
            className="text-primary hover:bg-accent flex w-full items-center px-3 py-1.5 text-left text-sm"
          >
            Customizado...
          </button>
        </div>
      </div>
    )
  }
  return (
    <div
      className="flex w-full flex-col"
      data-slot="date-range-filter-control-custom"
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <button
          type="button"
          onClick={() => setStage('presets')}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-3.5" />
        </button>
        <span className="text-sm font-medium">Customizado</span>
      </div>
      <div className="space-y-2 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-8">De</span>
          <span className="flex-1 font-medium">
            {from ? format(from, 'dd/MM/yyyy', { locale: ptBR }) : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-8">Até</span>
          <span className="flex-1 font-medium">
            {to ? format(to, 'dd/MM/yyyy', { locale: ptBR }) : '—'}
          </span>
        </div>
      </div>
      <div className="border-t px-2 py-2">
        <Calendar
          mode="range"
          selected={{ from, to }}
          onSelect={(range) => {
            setFrom(range?.from)
            setTo(range?.to)
          }}
          locale={ptBR}
        />
      </div>
      <div className="flex items-center justify-end border-t px-3 py-2 text-xs">
        <button
          type="button"
          onClick={handleCustomApply}
          disabled={!from || !to}
          className={cn(
            'text-primary font-medium hover:underline',
            (!from || !to) && 'pointer-events-none opacity-50'
          )}
        >
          Aplicar
        </button>
      </div>
    </div>
  )
}
