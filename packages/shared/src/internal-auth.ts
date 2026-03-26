import { createHmac, timingSafeEqual } from 'node:crypto'

const SIGNATURE_LENGTH = 64

export function signRequest(
  secret: string,
  method: string,
  path: string,
  body: string,
  timestamp: number
): string {
  const payload = `${String(timestamp)}.${method}.${path}.${body}`
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function verifyRequest(
  secret: string,
  signature: string,
  method: string,
  path: string,
  body: string,
  timestamp: number,
  maxAge: number = 300
): boolean {
  const now = Math.floor(Date.now() / 1000)

  if (Math.abs(now - timestamp) > maxAge) {
    return false
  }

  if (signature.length !== SIGNATURE_LENGTH) {
    return false
  }

  const expected = signRequest(secret, method, path, body, timestamp)

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
