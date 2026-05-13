import { createHash } from 'node:crypto'

interface BuildCacheKeyInput {
  readonly plate?: string
  readonly chassi?: string
}

const CACHE_KEY_PREFIX = 'vlookup:'

export function buildCacheKey(input: BuildCacheKeyInput): string {
  const plate =
    input.plate?.trim().toUpperCase().replace(/[-\s]/g, '') || undefined
  const chassi = input.chassi?.trim().toUpperCase() || undefined
  const raw = plate ? `plate:${plate}` : chassi ? `chassi:${chassi}` : null
  if (!raw) {
    throw new Error('buildCacheKey requires plate or chassi')
  }
  const hash = createHash('sha256').update(raw).digest('hex')
  return `${CACHE_KEY_PREFIX}${hash}`
}
