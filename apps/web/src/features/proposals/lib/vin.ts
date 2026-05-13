const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/

export function normalizeVin(value: string): string {
  return value.trim().toUpperCase()
}

export function isValidVin(value: string): boolean {
  return VIN_REGEX.test(normalizeVin(value))
}
