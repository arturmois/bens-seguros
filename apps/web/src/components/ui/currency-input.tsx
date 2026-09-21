'use client'

import { useCallback, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  centsToDisplay,
  cleanPastedBRL,
  formatBRLInput,
  parseBRLToCents,
} from '@/lib/currency'

interface CurrencyInputProps {
  readonly value: number
  readonly onChange: (cents: number) => void
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly id?: string
  readonly name?: string
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00',
  disabled,
  id,
  name,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState(() => centsToDisplay(value))
  const lastExternalValue = useRef(value)
  if (value !== lastExternalValue.current) {
    lastExternalValue.current = value
    setDisplay(centsToDisplay(value))
  }
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const formatted = formatBRLInput(raw)
      setDisplay(formatted)
      const cents = parseBRLToCents(formatted)
      lastExternalValue.current = cents
      onChange(cents)
    },
    [onChange]
  )
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text')
      const cleaned = cleanPastedBRL(pasted)
      const formatted = formatBRLInput(cleaned)
      setDisplay(formatted)
      const cents = parseBRLToCents(formatted)
      lastExternalValue.current = cents
      onChange(cents)
    },
    [onChange]
  )
  const handleBlur = useCallback(() => {
    if (!display) return
    const cents = parseBRLToCents(display)
    if (cents === 0) {
      setDisplay('')
      return
    }
    setDisplay(centsToDisplay(cents))
  }, [display])
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 select-none text-muted-foreground text-sm">
        R$
      </span>
      <Input
        type="text"
        inputMode="decimal"
        aria-label="Valor em reais"
        id={id}
        name={name}
        value={display}
        onChange={handleInput}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-10"
      />
    </div>
  )
}
