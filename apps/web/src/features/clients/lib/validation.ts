function stripDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function calculateCpfDigit(digits: string, length: number): number {
  let sum = 0
  for (let i = 0; i < length; i += 1) {
    sum += Number(digits[i]) * (length + 1 - i)
  }
  const remainder = (sum * 10) % 11
  return remainder === 10 ? 0 : remainder
}

export function isValidCpf(input: string): boolean {
  const digits = stripDigits(input)
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false
  const firstDigit = calculateCpfDigit(digits, 9)
  if (firstDigit !== Number(digits[9])) return false
  const secondDigit = calculateCpfDigit(digits, 10)
  return secondDigit === Number(digits[10])
}

const CNPJ_WEIGHTS_FIRST = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const
const CNPJ_WEIGHTS_SECOND = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const

function calculateCnpjDigit(
  digits: string,
  weights: readonly number[]
): number {
  let sum = 0
  for (let i = 0; i < weights.length; i += 1) {
    const weight = weights[i] ?? 0
    sum += Number(digits[i]) * weight
  }
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

export function isValidCnpj(input: string): boolean {
  const digits = stripDigits(input)
  if (digits.length !== 14) return false
  if (/^(\d)\1{13}$/.test(digits)) return false
  const firstDigit = calculateCnpjDigit(digits, CNPJ_WEIGHTS_FIRST)
  if (firstDigit !== Number(digits[12])) return false
  const secondDigit = calculateCnpjDigit(digits, CNPJ_WEIGHTS_SECOND)
  return secondDigit === Number(digits[13])
}

import { ApiError } from '@/lib/api-client'

export function extractExistingClientId(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null
  if (error.code !== 'CLIENT_ALREADY_EXISTS') return null
  const id = error.details?.existingClientId
  return typeof id === 'string' && id.length > 0 ? id : null
}
