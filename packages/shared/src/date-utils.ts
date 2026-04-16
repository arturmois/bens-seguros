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
  return day <= daysInMonth[month - 1]
}

const CENTURY_PIVOT = 30

export function applyCenturyPivot(twoDigitYear: number): number {
  if (twoDigitYear >= CENTURY_PIVOT) return 1900 + twoDigitYear
  return 2000 + twoDigitYear
}
