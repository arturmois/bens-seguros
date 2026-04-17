import type { Redis } from 'ioredis'
import { pino } from 'pino'

const logger = pino({ name: 'cache-service' })

export interface CacheService {
  get<TResult>(key: string): Promise<TResult | null>
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
}

export class RedisCacheService implements CacheService {
  constructor(private readonly redis: Redis) {}

  async get<TResult>(key: string): Promise<TResult | null> {
    try {
      const data = await this.redis.get(key)
      if (!data) return null
      return JSON.parse(data) as TResult
    } catch (err) {
      logger.warn({ err, key }, 'Cache get failed — falling back to DB')
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch (err) {
      logger.warn({ err, key }, 'Cache set failed — skipping cache write')
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key)
    } catch (err) {
      logger.warn({ err, key }, 'Cache delete failed — cache may be stale')
    }
  }
}

export class NoopCacheService implements CacheService {
  async get<TResult>(_key: string): Promise<TResult | null> {
    return null
  }

  async set(_key: string, _value: unknown, _ttlSeconds: number): Promise<void> {
    // Intentional no-op — used when Redis is unavailable.
  }

  async delete(_key: string): Promise<void> {
    // Intentional no-op.
  }
}
