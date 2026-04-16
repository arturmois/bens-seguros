import type { ApiPhone } from '../types/api.js'
import type { PhoneInput } from '../types/common.js'

/** Converts an ISO date string to the API's UTC-3 format. */
export function formatDateToApi(isoDate: string): string {
  return `${isoDate}T03:00:00.000Z`
}

/**
 * Formats a PhoneInput to the API phone shape.
 * 9-digit numbers: '99999-8888', 8-digit: '9999-8888'.
 * Area code wrapped in parentheses: '(11)'.
 */
export function formatPhone(phone: PhoneInput | null): ApiPhone {
  if (!phone) {
    return { Ddd: null, Numero: null }
  }

  const ddd = `(${phone.areaCode})`
  const digits = phone.number
  const dashPosition = digits.length > 8 ? 5 : 4
  const formatted = `${digits.slice(0, dashPosition)}-${digits.slice(dashPosition)}`

  return { Ddd: ddd, Numero: formatted }
}

/** Converts a boolean to the API's '0'/'1' string representation. */
export function boolToApi(value: boolean): '0' | '1' {
  return value ? '1' : '0'
}
