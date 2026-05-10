import { CHAT_LIMITS, isRecord } from '@repo/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type IORedis from 'ioredis'

const MAX_REQUESTS_PER_MINUTE = CHAT_LIMITS.WIDGET_RATE_LIMIT_PER_MIN

async function isRateLimited(redis: IORedis, ip: string): Promise<boolean> {
  const key = `widget:rl:${ip}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, 60)
  }
  return count > MAX_REQUESTS_PER_MINUTE
}

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

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

export function isValidObjectId(value: string): boolean {
  return OBJECT_ID_RE.test(value)
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
  if (!requestOrigin) return false
  if (allowedOrigins.length === 0) return false
  return allowedOrigins.some(
    (origin) => origin === '*' || requestOrigin === origin
  )
}

export async function rateLimitHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const redis: IORedis = request.server.redisGeneral
  const ip = getClientIp(request)
  const limited = await isRateLimited(redis, ip)
  if (limited) {
    await reply.status(429).send({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas requisições. Tente novamente em alguns instantes.',
      },
    })
  }
}
