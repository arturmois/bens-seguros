import { CHAT_LIMITS, isRecord } from '@repo/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'

// ---------------------------------------------------------------------------
// Rate limiter (simple IP-based, in-memory)
// ---------------------------------------------------------------------------

interface RateBucket {
  count: number
  resetAt: number
}

const ipBuckets = new Map<string, RateBucket>()

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = CHAT_LIMITS.WIDGET_RATE_LIMIT_PER_MIN

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = ipBuckets.get(ip)

  if (!bucket || now >= bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  bucket.count += 1
  return bucket.count > RATE_LIMIT_MAX
}

// Periodic cleanup to prevent memory leak
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [ip, bucket] of ipBuckets) {
    if (now >= bucket.resetAt) {
      ipBuckets.delete(ip)
    }
  }
}, RATE_LIMIT_WINDOW_MS)

// Allow Node to exit even if the interval is still running
cleanupInterval.unref()

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const DEFAULT_WIDGET_COLOR = '#1f4b5f'
export const DEFAULT_WELCOME_MESSAGE = 'Olá! Como podemos ajudar?'
export const MESSAGES_PER_PAGE = CHAT_LIMITS.MESSAGES_PER_PAGE

export function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? request.ip
  }
  return request.ip
}

export function getChannelConfig(config: unknown): {
  widgetColor: string
  welcomeMessage: string
  allowedOrigins: string[]
} {
  if (!isRecord(config)) {
    return {
      widgetColor: DEFAULT_WIDGET_COLOR,
      welcomeMessage: DEFAULT_WELCOME_MESSAGE,
      allowedOrigins: [],
    }
  }

  const widgetColor =
    typeof config['widgetColor'] === 'string'
      ? config['widgetColor']
      : DEFAULT_WIDGET_COLOR

  const welcomeMessage =
    typeof config['welcomeMessage'] === 'string'
      ? config['welcomeMessage']
      : DEFAULT_WELCOME_MESSAGE

  const rawOrigins = config['allowedOrigins']
  const allowedOrigins = Array.isArray(rawOrigins)
    ? rawOrigins.filter((o): o is string => typeof o === 'string')
    : []

  return { widgetColor, welcomeMessage, allowedOrigins }
}

export function isValidOrigin(
  allowedOrigins: readonly string[],
  requestOrigin: string | undefined
): boolean {
  if (allowedOrigins.length === 0) return true
  if (!requestOrigin) return false
  return allowedOrigins.some((origin) => requestOrigin.startsWith(origin))
}

export async function rateLimitHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const ip = getClientIp(request)
  if (isRateLimited(ip)) {
    await reply.status(429).send({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas requisições. Tente novamente em alguns instantes.',
      },
    })
  }
}
