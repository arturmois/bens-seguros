import { format } from '@react-input/mask'

export const CPF_MASK = {
  mask: '___.___.___-__',
  replacement: { _: /\d/ },
}

export const CNPJ_MASK = {
  mask: '__.___.___/____-__',
  replacement: { _: /\d/ },
}

export const PHONE_MASK = {
  mask: '+55 (__) _____-____',
  replacement: { _: /\d/ },
}

export const CEP_MASK = {
  mask: '_____-___',
  replacement: { _: /\d/ },
}

export function documentMask(value: string): {
  mask: string
  replacement: Record<string, RegExp>
} {
  const digits = value.replace(/\D/g, '')
  if (digits.length > 11) {
    return CNPJ_MASK
  }
  return CPF_MASK
}

export function formatDocument(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function stripDocument(formatted: string): string {
  return formatted.replace(/\D/g, '').slice(0, 14)
}

export function formatPhoneForMask(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const withoutCountry =
    digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits
  return format(withoutCountry, PHONE_MASK)
}

export function formatCep(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (!digits) return ''
  return format(digits, CEP_MASK)
}
