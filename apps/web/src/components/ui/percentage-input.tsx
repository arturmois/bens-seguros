'use client'

import { useCallback, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  basisToDisplay,
  cleanPastedPercent,
  formatPercentInput,
  parsePercentToBasis,
} from '@/lib/currency'

interface PercentageInputProps {
  readonly value: number
  readonly onChange: (basis: number) => void
  readonly max?: number
  readonly placeholder?: string
  readonly disabled?: boolean
  readonly id?: string
  readonly name?: string
}

export function PercentageInput({
  value,
  onChange,
  max = 10000,
  placeholder = '0,00',
  disabled,
  id,
  name,
}: PercentageInputProps) {
  const maxPercent = max / 100
  const [display, setDisplay] = useState(() => basisToDisplay(value))
  const lastExternalValue = useRef(value)
  if (value !== lastExternalValue.current) {
    lastExternalValue.current = value
    setDisplay(basisToDisplay(value))
  }
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const formatted = formatPercentInput(raw, maxPercent)
      setDisplay(formatted)
      const basis = parsePercentToBasis(formatted, max)
      lastExternalValue.current = basis
      onChange(basis)
    },
    [onChange, max, maxPercent]
  )
  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text')
      const cleaned = cleanPastedPercent(pasted)
      const formatted = formatPercentInput(cleaned, maxPercent)
      setDisplay(formatted)
      const basis = parsePercentToBasis(formatted, max)
      lastExternalValue.current = basis
      onChange(basis)
    },
    [onChange, max, maxPercent]
  )
  const handleBlur = useCallback(() => {
    if (!display) return
    const basis = parsePercentToBasis(display, max)
    if (basis === 0) {
      setDisplay('')
      return
    }
    setDisplay(basisToDisplay(basis))
  }, [display, max])
  return (
    <div className="relative">
      <Input
        type="text"
        inputMode="decimal"
        aria-label="Porcentagem"
        id={id}
        name={name}
        value={display}
        onChange={handleInput}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-8"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 z-10 -translate-y-1/2 select-none text-muted-foreground text-sm">
        %
      </span>
    </div>
  )
}
