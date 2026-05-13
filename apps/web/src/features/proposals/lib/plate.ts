const PLATE_OLD = /^[A-Z]{3}[0-9]{4}$/
const PLATE_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/

export function normalizePlate(value: string): string {
  return value.trim().toUpperCase().replace(/[-\s]/g, '')
}

export function isValidPlate(value: string): boolean {
  const normalized = normalizePlate(value)
  return PLATE_OLD.test(normalized) || PLATE_MERCOSUL.test(normalized)
}

export function formatPlate(value: string): string {
  const normalized = normalizePlate(value)
  if (PLATE_OLD.test(normalized)) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`
  }
  if (PLATE_MERCOSUL.test(normalized)) {
    return normalized
  }
  return value
}
