export function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true
  if (year % 100 === 0) return false
  return year % 4 === 0
}

export function isValidDate(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) return false
  if (day < 1) return false
  const currentYear = new Date().getFullYear()
  if (year < 1900 || year > currentYear + 10) return false
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  const limit = daysInMonth[month - 1]
  if (limit === undefined) return false
  return day <= limit
}

const CENTURY_PIVOT = 30

export function applyCenturyPivot(twoDigitYear: number): number {
  if (twoDigitYear >= CENTURY_PIVOT) return 1900 + twoDigitYear
  return 2000 + twoDigitYear
}

const DIGITS_ONLY = /^\d+$/
const SEPARATED = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/

export function parseFlexibleDate(input: string): Date | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const digitsMatch = trimmed.match(DIGITS_ONLY)
  if (digitsMatch) {
    if (trimmed.length === 8) {
      return parseDigits(
        trimmed.slice(0, 2),
        trimmed.slice(2, 4),
        trimmed.slice(4, 8)
      )
    }
    if (trimmed.length === 6) {
      const day = trimmed.slice(0, 2)
      const month = trimmed.slice(2, 4)
      const year = applyCenturyPivot(Number(trimmed.slice(4, 6)))
      return parseDigits(day, month, String(year))
    }
    return null
  }
  const separated = trimmed.match(SEPARATED)
  if (!separated) return null
  const day = separated[1]
  const month = separated[2]
  const yearPart = separated[3]
  if (!day || !month || !yearPart) return null
  if (yearPart.length === 2) return null
  return parseDigits(day, month, yearPart)
}

function parseDigits(
  dayStr: string,
  monthStr: string,
  yearStr: string
): Date | null {
  const day = Number(dayStr)
  const month = Number(monthStr)
  const year = Number(yearStr)
  if (!isValidDate(day, month, year)) return null
  return new Date(Date.UTC(year, month - 1, day))
}

const VALID_MASK_CHARS = /[^\d/-]/g

export function normalizeToMask(input: string): string {
  if (!input) return ''
  const cleaned = input.replace(VALID_MASK_CHARS, '').replace(/-/g, '/')
  if (DIGITS_ONLY.test(cleaned)) {
    if (cleaned.length === 8) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`
    }
    if (cleaned.length === 6) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 6)}`
    }
    return cleaned
  }
  return cleaned.slice(0, 10)
}

export function formatDateToBR(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const year = date.getUTCFullYear()
  return `${day}/${month}/${year}`
}
