export const CPF_MASK = {
  mask: '___.___.___-__',
  replacement: { _: /\d/ },
}

export const CNPJ_MASK = {
  mask: '__.___.___/____-__',
  replacement: { _: /\d/ },
}

export const PHONE_MASK = {
  mask: '(__) _____-____',
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
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function stripDocument(formatted: string): string {
  return formatted.replace(/\D/g, '').slice(0, 14)
}
