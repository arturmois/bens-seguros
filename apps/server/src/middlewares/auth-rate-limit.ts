import { RATE_LIMITS } from '@repo/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type IORedis from 'ioredis'

interface RateLimitConfig {
  readonly max: number
  readonly windowSeconds: number
}

interface AuthRateLimitPath {
  readonly suffix: string
  readonly config: RateLimitConfig
  readonly keyExtractor: (request: FastifyRequest) => string
}

const AUTH_RATE_LIMIT_PATHS: readonly AuthRateLimitPath[] = [
  {
    suffix: '/sign-in/email',
    config: RATE_LIMITS.AUTH.LOGIN,
    keyExtractor: (request) => {
      const body = request.body as Record<string, unknown> | undefined
      const email =
        typeof body?.['email'] === 'string' ? body['email'] : 'unknown'
      return `auth:login:${email.toLowerCase()}`
    },
  },
  {
    suffix: '/forget-password',
    config: RATE_LIMITS.AUTH.FORGOT_PASSWORD,
    keyExtractor: (request) => {
      const body = request.body as Record<string, unknown> | undefined
      const email =
        typeof body?.['email'] === 'string' ? body['email'] : 'unknown'
      return `auth:forgot:${email.toLowerCase()}`
    },
  },
  {
    suffix: '/sign-up/email',
    config: RATE_LIMITS.AUTH.REGISTRATION,
    keyExtractor: (request) => `auth:register:${request.ip}`,
  },
]

async function checkRateLimit(
  redis: IORedis,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter: number }> {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const windowStart = now - windowMs

  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, 0, windowStart)
  pipeline.zcard(key)
  pipeline.zadd(key, String(now), `${String(now)}:${String(Math.random())}`)
  pipeline.expire(key, config.windowSeconds)

  const results = await pipeline.exec()
  const countResult = results?.[1]
  const currentCount = Number(countResult?.[1] ?? 0)

  if (currentCount >= config.max) {
    const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES')
    const oldestTimestamp = Number(oldestEntry[1] ?? now)
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000)
    return { allowed: false, retryAfter: Math.max(retryAfter, 1) }
  }

  return { allowed: true, retryAfter: 0 }
}

export function createAuthRateLimitHook(
  redis: IORedis
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const matchedPath = AUTH_RATE_LIMIT_PATHS.find((p) =>
      request.url.endsWith(p.suffix)
    )

    if (!matchedPath) return

    const key = matchedPath.keyExtractor(request)
    const result = await checkRateLimit(redis, key, matchedPath.config)

    if (!result.allowed) {
      void reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Try again in ${String(result.retryAfter)} seconds.`,
          retryAfter: result.retryAfter,
        },
      })
    }
  }
}
