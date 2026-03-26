import { createHmac, timingSafeEqual } from 'node:crypto'

const SIGNATURE_LENGTH = 64

interface SignRequestInput {
  secret: string
  method: string
  path: string
  tenantId: string
  body: string
  timestamp: number
}

export function signRequest(input: SignRequestInput): string {
  const payload = `${String(input.timestamp)}.${input.method}.${input.path}.${input.tenantId}.${input.body}`
  return createHmac('sha256', input.secret).update(payload).digest('hex')
}

interface VerifyRequestInput extends SignRequestInput {
  signature: string
  maxAge?: number
}

export function verifyRequest(input: VerifyRequestInput): boolean {
  const maxAge = input.maxAge ?? 300
  const now = Math.floor(Date.now() / 1000)

  if (Math.abs(now - input.timestamp) > maxAge) {
    return false
  }

  if (input.signature.length !== SIGNATURE_LENGTH) {
    return false
  }

  const expected = signRequest(input)

  return timingSafeEqual(Buffer.from(input.signature), Buffer.from(expected))
}
