import type { ApiPhone } from '../types/api.js'
import type { PhoneInput } from '../types/common.js'

export function formatDateToApi(isoDate: string): string {
  return `${isoDate}T03:00:00.000Z`
}

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

export function boolToApi(value: boolean): '0' | '1' {
  return value ? '1' : '0'
}
