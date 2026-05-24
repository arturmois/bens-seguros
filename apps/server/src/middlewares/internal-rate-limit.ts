import { RATE_LIMITS } from '@repo/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type IORedis from 'ioredis'

interface RateLimitConfig {
  readonly max: number
  readonly windowSeconds: number
}

const INTERNAL_CONFIG: RateLimitConfig = {
  max: RATE_LIMITS.INTERNAL.max,
  windowSeconds: RATE_LIMITS.INTERNAL.windowSeconds,
}

async function checkRateLimit(
  redis: IORedis,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; retryAfter: number }> {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const windowStart = now - windowMs
  const entryKey = `${String(now)}:${String(Math.random())}`
  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, 0, windowStart)
  pipeline.zadd(key, String(now), entryKey)
  pipeline.zcard(key)
  pipeline.expire(key, config.windowSeconds)
  const results = await pipeline.exec()
  const countResult = results?.[2]
  const currentCount = Number(countResult?.[1] ?? 0)
  if (currentCount > config.max) {
    await redis.zrem(key, entryKey)
    const oldestEntry = await redis.zrange(key, 0, 0, 'WITHSCORES')
    const oldestTimestamp = Number(oldestEntry[1] ?? now)
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000)
    return { allowed: false, retryAfter: Math.max(retryAfter, 1) }
  }
  return { allowed: true, retryAfter: 0 }
}

// Runs as preHandler AFTER internalAuthMiddleware — request.organizationId is
// already HMAC-validated by the time we get here. Falls back to IP when orgId
// is absent (should not happen on internal routes, but defensive).
export function createInternalRateLimitHook(
  redis: IORedis
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = request.organizationId
      ? `internal:org:${request.organizationId}`
      : `internal:ip:${request.ip}`
    const result = await checkRateLimit(redis, key, INTERNAL_CONFIG)
    if (!result.allowed) {
      void reply
        .status(429)
        .header('Retry-After', String(result.retryAfter))
        .send({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Try again in ${String(result.retryAfter)} seconds.`,
            retryAfter: result.retryAfter,
          },
        })
      return
    }
  }
}
