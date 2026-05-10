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

export function centsToDisplay(cents: number): string {
  if (!cents) return ''
  const reais = (cents / 100).toFixed(2)
  const splitResult = reais.split('.')
  const intPart = splitResult[0] ?? '0'
  const decPart = splitResult[1] ?? '00'
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots},${decPart}`
}

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

export function cleanPastedBRL(pasted: string): string {
  return pasted.replace(/R\$\s*/g, '').trim()
}

export function cleanPastedPercent(pasted: string): string {
  return pasted.replace(/%/g, '').trim()
}

export function parsePercentToBasis(display: string, max = 10000): number {
  if (!display) return 0
  const cleaned = display.replace(/[^\d,]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  if (isNaN(num) || num < 0) return 0
  return Math.min(Math.round(num * 100), max)
}

export function basisToDisplay(basis: number): string {
  if (!basis) return ''
  return (basis / 100).toFixed(2).replace('.', ',')
}

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
