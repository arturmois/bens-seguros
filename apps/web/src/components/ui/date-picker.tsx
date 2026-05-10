'use client'

import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { InputMask } from '@react-input/mask'
import {
  formatDateToBR,
  normalizeToMask,
  parseFlexibleDate,
} from '@repo/shared/date-utils'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import * as React from 'react'

interface DatePickerProps {
  readonly value?: Date
  readonly onChange: (date: Date | undefined) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly className?: string
  readonly id?: string
}

const MASK_REPLACEMENT = { _: /\d/ } as const

export function DatePicker({
  value,
  onChange,
  placeholder = 'DD/MM/AAAA',
  disabled,
  className,
  id,
}: DatePickerProps): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [textValue, setTextValue] = React.useState(
    value ? formatDateToBR(value) : ''
  )
  const [localError, setLocalError] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const skipSyncRef = React.useRef(false)
  React.useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false
      return
    }
    setTextValue(value ? formatDateToBR(value) : '')
    setLocalError(false)
  }, [value])
  React.useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (containerRef.current && !containerRef.current.contains(target)) {
        requestAnimationFrame(() => setOpen(false))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTextValue(event.target.value)
    setLocalError(false)
  }
  function handleBlur() {
    const trimmed = textValue.trim()
    if (!trimmed) {
      setLocalError(false)
      if (value !== undefined) onChange(undefined)
      return
    }
    const parsed = parseFlexibleDate(trimmed)
    if (!parsed) {
      setLocalError(true)
      if (value !== undefined) {
        skipSyncRef.current = true
        onChange(undefined)
      }
      return
    }
    setLocalError(false)
    setTextValue(formatDateToBR(parsed))
    onChange(parsed)
  }
  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text')
    if (!pasted) return
    event.preventDefault()
    const normalized = normalizeToMask(pasted)
    setTextValue(normalized)
    const parsed = parseFlexibleDate(normalized)
    if (parsed) {
      setLocalError(false)
      setTextValue(formatDateToBR(parsed))
      onChange(parsed)
      return
    }
    setLocalError(true)
    if (value !== undefined) {
      skipSyncRef.current = true
      onChange(undefined)
    }
  }
  function handleFocus(event: React.FocusEvent<HTMLInputElement>) {
    if (value) event.target.select()
  }
  function handleCalendarSelect(date: Date | undefined) {
    if (!date) return
    setOpen(false)
    setLocalError(false)
    setTextValue(formatDateToBR(date))
    onChange(date)
  }
  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <InputMask
        component={Input}
        mask="__/__/____"
        replacement={MASK_REPLACEMENT}
        value={textValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        inputMode="numeric"
        id={id}
        aria-invalid={localError || undefined}
        aria-describedby={localError ? `${id ?? 'date'}-error` : undefined}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Abrir calendário"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground pointer-events-auto absolute right-2 top-1/2 z-10 -translate-y-1/2 disabled:opacity-50"
      >
        <CalendarIcon className="size-4" />
      </button>
      {localError && (
        <span
          id={`${id ?? 'date'}-error`}
          className="text-destructive mt-1 block text-xs"
        >
          Data inválida
        </span>
      )}
      {open && (
        <div className="bg-popover absolute left-0 top-full z-50 mt-1 rounded-xl border p-2 shadow-lg">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            startMonth={new Date(1920, 0)}
            endMonth={new Date(new Date().getFullYear() + 10, 11)}
            selected={value}
            onSelect={handleCalendarSelect}
            locale={ptBR}
            defaultMonth={value}
          />
        </div>
      )}
    </div>
  )
}
