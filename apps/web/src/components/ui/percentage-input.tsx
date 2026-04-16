'use client'

import { useCallback, useRef, useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  basisToDisplay,
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

  // Sync display when external value changes (e.g. form reset)
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
        id={id}
        name={name}
        value={display}
        onChange={handleInput}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-8"
      />
      <span className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 select-none text-sm">
        %
      </span>
    </div>
  )
}
