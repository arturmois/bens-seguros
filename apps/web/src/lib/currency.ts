/**
 * Converts a BRL-formatted string (e.g. "2.719,48") to integer cents.
 * Strips R$, spaces, dots (thousand sep). Treats comma as decimal separator.
 * Returns 0 for empty/invalid input.
 */
export function parseBRLToCents(display: string): number {
  if (!display) return 0
  const cleaned = display
    .replace(/R\$\s*/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const num = parseFloat(cleaned)
  if (isNaN(num) || num < 0) return 0
  return Math.round(num * 100)
}

/**
 * Converts integer cents to a BRL-formatted display string (e.g. "2.719,48").
 * Returns empty string for 0/falsy (so placeholder shows).
 */
export function centsToDisplay(cents: number): string {
  if (!cents) return ''
  const reais = (cents / 100).toFixed(2)
  const splitResult = reais.split('.')
  const intPart = splitResult[0] ?? '0'
  const decPart = splitResult[1] ?? '00'
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots},${decPart}`
}

/**
 * Formats a raw user-typed string into BRL display format.
 * Strips non-digit/comma chars, enforces max 2 decimal places,
 * adds thousand separators. Used on every keystroke.
 * Multiple commas: only the first is treated as decimal separator.
 */
export function formatBRLInput(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, '')
  if (!cleaned) return ''

  const firstComma = cleaned.indexOf(',')
  let intPart: string
  let decPart: string | null

  if (firstComma === -1) {
    intPart = cleaned
    decPart = null
  } else {
    intPart = cleaned.slice(0, firstComma)
    decPart = cleaned.slice(firstComma + 1).replace(/,/g, '')
  }

  intPart = intPart.replace(/^0+(?=\d)/, '')
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  if (decPart !== null) {
    return `${intPart},${decPart.slice(0, 2)}`
  }
  return intPart
}

/**
 * Cleans a pasted value for BRL currency input.
 * Handles: "R$ 2.719,48", "1500,00", "3.450,99".
 */
export function cleanPastedBRL(pasted: string): string {
  return pasted.replace(/R\$\s*/g, '').trim()
}

/**
 * Cleans a pasted value for percentage input.
 * Strips trailing "%" and whitespace.
 */
export function cleanPastedPercent(pasted: string): string {
  return pasted.replace(/%/g, '').trim()
}

/**
 * Converts a percentage display string (e.g. "15,50") to basis points.
 * Clamps to max (default 10000 = 100%).
 */
export function parsePercentToBasis(display: string, max = 10000): number {
  if (!display) return 0
  const cleaned = display.replace(/[^\d,]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  if (isNaN(num) || num < 0) return 0
  return Math.min(Math.round(num * 100), max)
}

/**
 * Converts basis points to percentage display string (e.g. "15,50").
 * Returns empty string for 0/falsy.
 */
export function basisToDisplay(basis: number): string {
  if (!basis) return ''
  return (basis / 100).toFixed(2).replace('.', ',')
}

/**
 * Formats a raw user-typed string for percentage input.
 * Strips non-digit/comma, enforces max 2 decimal places.
 * Clamps to max percentage (default 100) including decimals.
 */
export function formatPercentInput(raw: string, maxPercent = 100): string {
  const cleaned = raw.replace(/[^\d,]/g, '')
  if (!cleaned) return ''

  const parts = cleaned.split(',')
  let intPart = parts[0] ?? ''
  const hasDecimalPart = parts.length > 1
  let decPart = hasDecimalPart ? (parts[1] ?? '') : null

  intPart = intPart.replace(/^0+(?=\d)/, '')

  const intVal = parseInt(intPart || '0', 10)
  if (intVal > maxPercent) {
    return `${maxPercent},00`
  }

  if (decPart !== null) {
    decPart = decPart.slice(0, 2)
    const numericValue = parseFloat(`${intVal}.${decPart || '0'}`)
    if (numericValue > maxPercent) {
      return `${maxPercent},00`
    }
    return `${intPart},${decPart}`
  }
  return intPart
}
